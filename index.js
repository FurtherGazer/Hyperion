import 'regenerator-runtime/runtime';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

tf.setBackend('wasm').then(() => main());

const NUM_KEYPOINTS = 468;
const NUM_IRIS_KEYPOINTS = 5;
const GREEN = '#32EEDB';
const RED = "#FF2C35";
const BLUE = "#157AB3";
const videoWidth = '600';
const videoHeight = '400';
window.rafID = null;
window.animation_status = false;

var canvas = document.getElementById('output');
// 此步骤创建了一个和 video 等大的 canvas
canvas.width = '600';
canvas.height = '400';
const canvasContainer = document.querySelector('.canvas-wrapper');
canvasContainer.style = `width: 600px; height: 400x`;
// 设置画板属性
var ctx = canvas.getContext('2d');
// 镜像翻转
ctx.translate(canvas.width, 0); 
ctx.scale(-1, 1);
ctx.fillStyle = GREEN;
ctx.strokeStyle = GREEN;
ctx.lineWidth = 2;
// 设置图层叠加方案
ctx.globalCompositeOperation="difference";

// 其他可选方案: difference 更加柔和
// 具体可参考: https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
async function setupCamera() {
    let constraints = {
        video: {
            width: 600,
            height: 400,
            facingMode: "user"
        },
        audio:false
    };
    // 获得video摄像头区域
    let video = document.getElementById("video");
    // 使关闭摄像头变得可可执行
    let stopBt = document.getElementById("closeBT");
    if (stopBt)stopBt.disabled = false;
    
    const MediaStream = await navigator.mediaDevices.getUserMedia(constraints)
    video.srcObject = MediaStream;
    video.play();
    console.log('Set MediaStream!'); // 对象
    window.CurMediaStream = MediaStream;

    return new Promise( 
        (resolve) => {
            video.onloadedmetadata = () => {
                resolve(video); 
            };
        }
    );
};
window.setupCamera = setupCamera;

// stop only camera
function stopVideoOnly(stream) {
    stream.getTracks().forEach(function(track) {
        if (track.readyState == 'live' && track.kind === 'video') {
            track.stop();
        }
    });
};
function stopMain(){
    if (window.CurMediaStream){
        stopVideoOnly(window.CurMediaStream)
    }else{
        console.log('没有正在运行的 MediaStream')
    }
    window.animation_status = false;
    window.cancelAnimationFrame(window.rafID);     
};
window.stopMain = stopMain;

// 清空 canvas 
function clearCanvas() {   
    var c = document.getElementById("output")
    var cxt= c.getContext("2d");
    cxt.clearRect(0,0,c.width,c.height);  
};

// 用于取 x,y 坐标的绝对值
function absXY(ports) {
    let a = ports;
    let b = [];
    a.forEach( i => {
        b.push( [Math.abs(i[0]), i[1]] )
    })
    return b
}

// 获取一群点中的均值中心点
function getCenterPort(ports) {
    let a=[], b=[];
    ports.forEach( i => {
        a.push(i[0]);
        b.push(i[1]);
    })
    let sum_a = a.reduce((previous, current) => current += previous);
    let sum_b = b.reduce((previous, current) => current += previous);
    let avg_a = sum_a / a.length;
    let avg_b = sum_b / b.length;
    return [avg_a, avg_b];
}

// 计算两点间距离
function distance(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

// 该函数用于画点
function _drawPoint(ctx, points, color='#32EEDB', radius=1) {
    try {
        for (let i = 0; i < points.length; i++) {
            const x = points[i][0];
            const y = points[i][1];
    
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fillStyle  = color;
            ctx.fill();
        }
    } catch (error) {
        // 存在获取不到脸部特征的情况
    }
}

function drawPoint(ctx, face, color='#32EEDB') {
    try {
        // mesh 是裁剪后图片中的脸部坐标
        // let a = face.mesh; 
        // .scaledMesh 是放缩后的坐标，对应实际传入图片中的位置（这个可以直接拿来用）
        let a = face.scaledMesh;
        let points = absXY(a)
        _drawPoint(ctx, points, color)
    } catch (error) {
        // 存在获取不到脸部特征的情况
    }
};

// 绘制脸部方框
function getFaceBox(ctx, face) {
    try {
        // 获取 boundingBox
        var bottomRight, topLeft, width, height, origin_x, origin_y;
        bottomRight = face.boundingBox.bottomRight.map(Math.abs);
        topLeft = face.boundingBox.topLeft.map(Math.abs);
        width = topLeft[0] - bottomRight[0];
        height = topLeft[1] - bottomRight[1];
        origin_x = bottomRight[0];
        origin_y = bottomRight[1];
        // .fillRect 填充矩形 .strokeRect 绘制矩形边框
        ctx.strokeRect(origin_x, origin_y, width, height);
    } catch (error) {
        // 
    }
};

// 绘制眼部图案
function drawRedEye(ctx, face) {
    let leftEyeLower0 = absXY(face.annotations.leftEyeLower0); // 左下眼睑的内层
    // let leftEyeLower1 = absXY(face.annotations.leftEyeLower1); // 左下眼睑的外层
    let leftEyeUpper0 = absXY(face.annotations.leftEyeUpper0); // 左上眼睑的内层
    // let leftEyeUpper1 = absXY(face.annotations.leftEyeUpper1); // 左上眼睑的外层

    _drawPoint(ctx, leftEyeLower0, RED);
    _drawPoint(ctx, leftEyeUpper0, RED);

    // 我们可以使用 leftEyeLower0 & leftEyeUpper0 的各坐标均值来确定眼球的中心点
    let leftEyeLowerCenter = getCenterPort(leftEyeLower0);
    let leftEyeUpperCenter = getCenterPort(leftEyeUpper0);
    let centerEye = getCenterPort([leftEyeLowerCenter, leftEyeUpperCenter])

    // 返回眼中心位置
    return centerEye
}

// 获取区间范围内随机数
function rand (min, max){
    return Math.floor((Math.random() * (max - min + 1)) + min);
}

//火焰粒子对象效果
function fireBall(position) {
    this.reset(position);
};
 //初始/重置粒子状态
fireBall.prototype.reset = function (position) {
      this._radius = rand(5, 25); // 随机产生初始粒子半径
      this._rel_position = {x:0, y:1}; // 相对位置
      this._abs_position = position || {x:-100,y:-100}; // 绝对位置，默认隐藏不见
      this._position = {
          "x": this._rel_position['x'] + this._abs_position['x'],
          "y": this._rel_position['y'] + this._abs_position['y']};
      this._lineWidth = 1;//粒子边界线宽
      this._color = 'rgba(255,5,0,0.3)';//粒子颜色
}
//渲染
fireBall.prototype.render=function(ctx){
    // 每次绘制时都根据相对位置和绝对位置，重新计算位置
    this._position['x'] = this._rel_position['x'] + this._abs_position['x'];
    this._position['y'] = this._rel_position['y'] + this._abs_position['y'];
    ctx.beginPath();
    // console.log(this._position)
    ctx.arc(this._position.x, this._position.y, this._radius, 0, Math.PI * 2, false);
    ctx.fillStyle = ctx.strokeStyle = this._color;
    ctx.lineWidth = this._lineWidth;
    ctx.fill();
    ctx.stroke();
}
// 更新粒子状态
fireBall.prototype.update = function (position) {
    // 此处的 position 用于当粒子元素半径小于0时的重置
    // console.log(this._radius, this._rel_position, this._position)
    if(this._radius>0){
        this._rel_position.x -= rand(-5,5); // 此处定义火焰粒子 x 轴变化的范围
        this._rel_position.y -= rand(4,5); // 此处定义了火焰粒子，y 轴变化的范围
        this._radius -= 0.5;
    }else{
        this.reset(position);
    }
}

//用多个粒子模拟火球视觉效果，粒子数量自定
let fires = [];
for(var i=0; i< 200; i++){
   fires.push(new fireBall({x: -100, y: -100}))
}

// 渲染相关线框
async function renderPrediction() {
    // console.log('draw', new Date())
    const predictions = await window.model.estimateFaces({
        input: document.querySelector("video"),
        flipHorizontal: true,
        predictIrises: false
    });

    // 清空，避免重复帧的影响
    clearCanvas(); 
    // 如果不清空，由于存在图层叠加方案，会是的画面异常的诡异。

    // 如果正常，则此时 video 图像渲染在 canvas 中
    ctx.drawImage(
        video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height);
    
    if (predictions){
        const face = predictions[0];
        // console.log(face)
        // // 描绘脸框
        // getFaceBox(ctx, face);

        // // 绘制脸部坐标点
        // drawPoint(ctx, face);

        // 绘制左眼区域
        let centerEyePosition = drawRedEye(ctx, face);
        let position = {'x':centerEyePosition[0], 'y':centerEyePosition[1]};
        // ctx.fillStyle = 'hsla(0, 0%, 0%, 0.2)';
        // 绘制眼部火焰
        fires.forEach(fire=>{
            fire.render(ctx);
            fire.update(position);
        });

    }

    // console.log(window.animation_status)
    if (window.animation_status){
        requestAnimationFrame(renderPrediction);
    } else {
        console.log('Stop!')
        clearCanvas();
    }
}

// 主函数
async function main() {
    // 开启摄像头
    await setupCamera();

    // 通过 await 代替了 then 保证当异步操作完成时再执行下一行。
    const model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
        ,{
            "maxFaces":1,
            "shouldLoadIrisModel":false
        }
    );
    console.log('model', model)
    window.model = model;

    // 绘制图像
    window.animation_status = true;
    window.rafID = renderPrediction()
}

window.main = main;

main();