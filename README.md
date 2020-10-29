# Hyperion

将你变成双眼冒光的怪物！

[体验网址](https://hyperion-jhxs5uvsja-de.a.run.app/)

效果示意图：
![](https://furthergazer.top/static/other/Hyperion_duangduang.gif)

## 使用方式

前置条件：
1. 开启GCP账号，并构建项目 
2. 开启 cloud run API & build API (如未开启，在命令执行过程中会提示你开启)
3. 开启 cloud shell —— 注，如果你不想使用 cloud shell，也可以在下载 gcloud sdk，然后完成初始化配置

```bash
# 克隆项目到本地
git clone https://github.com/FurtherGazer/Hyperion.git
cd ./Hyperion

# 构建容器
gcloud builds submit --tag gcr.io/<your-gcp-project-id>/hyperion:v1.01 .

# 在 Cloud Run 中构建服务
gcloud beta run deploy --image gcr.io/<your-gcp-project-id>/hyperion:v1.01 --platform managed 
```

服务构建完毕后，会返回给你可以访问的网址，打开即可使用。