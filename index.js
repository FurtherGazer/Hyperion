import 'regenerator-runtime/runtime'

const faceLandmarksDetection = require('@tensorflow-models/face-landmarks-detection');

require('@tensorflow/tfjs-backend-wasm');

// 清除 canvas 
function clearCanvas() {   
    var c = document.getElementById("output")
    var cxt= c.getContext("2d");
    cxt.clearRect(0,0,c.width,c.height);  
};

// 计算两点间距离
function distance(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

// 该函数用于画点
function drawPoint(ctx, face) {
    try {

        let a = face.scaledMesh;
        let points = [];
        a.forEach(e => {
            points.push( [e[0], e[1]].map(Math.abs) )
        });
        for (let i = 0; i < points.length; i++) {
            const x = points[i][0];
            const y = points[i][1];
    
            ctx.beginPath();
            ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI);
            ctx.fill();
        }
    } catch (error) {
        // 存在获取不到脸部特征的情况
    }
};

// 绘制脸部方框
function getFaceBox(ctx, face) {
    try {
        var bottomRight, topLeft, width, height, origin_x, origin_y;
        bottomRight = face.boundingBox.bottomRight.map(Math.abs);
        topLeft = face.boundingBox.topLeft.map(Math.abs);
        width = topLeft[0] - bottomRight[0];
        height = topLeft[1] - bottomRight[1];
        origin_x = bottomRight[0];
        origin_y = bottomRight[1];
        ctx.strokeRect(origin_x, origin_y, width, height);
    } catch (error) {
    }
};

// 渲染相关线框
async function renderPrediction() {
    const predictions = await window.model.estimateFaces({
        input: document.querySelector("video"),
        flipHorizontal: true,
        predictIrises: false
    });

    ctx.drawImage(
        video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height);
    
    if (predictions){
        const face = predictions[0];
        getFaceBox(ctx, face);
        drawPoint(ctx, face);
    }

    if (window.animation_status){
        requestAnimationFrame(renderPrediction);
    } else {
        console.log('Stop!')
        clearCanvas();
    }
}

// 主函数
async function main() {
    await setupCamera();

    const model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
        ,{
            "maxFaces":1,
        }
    );
    console.log('model', model)
    window.model = model;

    window.animation_status = true;
    window.rafID = renderPrediction()
}

window.main = main;
main();