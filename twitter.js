// https://qiita.com/yukisato1987/items/dcee30eccaa643416fdb
// https://github.com/desmondmorris/node-twitter
// https://daiki-sekiguchi.com/2018/07/17/twitter-api-error-code89-invalid-of-expired-token/
const fs = require("fs");

const Obniz = require("obniz");
var obniz = new Obniz("1687-3789");

const Twitter = require("twitter");
// const client = new Twitter(JSON.parse(fs.readFileSync("secret.json","utf-8")));
// const params = {Name: "stockPriceForecast"};
const client = new Twitter(JSON.parse(fs.readFileSync("secret_plant.json","utf-8")));
const params = {Name: "python-test-iot"};

const ROTATE_TIME = 500;
const STOP_TIME = 80;

// ツイートする内容
BBQ_tweet = "テスト\n\n#IoTLT\n#morinaga"

let processingTime = 0;
let startTime;

obniz.onconnect = async () => {

    //10秒ごとにループを回し、前ループからいいねが増えたらその分だけシャボン玉を飛ばす
    //初期値を-1に設定し、サーバ立ち上げ時に既にされているいいね分のシャボン玉を飛ばす
    let prevLikeCount = -1;
    let led = obniz.wired("LED", { anode: 0, cathode: 1 });
    let servo01 = obniz.wired("ServoMotor",{ gnd:4, vcc:5, signal:6});
    let servo02 = obniz.wired("ServoMotor",{ gnd:8, vcc:9, signal:10 });

    await client.post('statuses/update', {status: BBQ_tweet}, function(error, tweet, response){
        if (!error) {
            console.log(tweet);
        } else {
            console.log('error');
        }
    });

    await obniz.repeat(async function(){

        await client.get('statuses/user_timeline', params, async function(error,tweets,response){
            // obniz.debugprint = true;
            if (error) {
                console.log("error");
                return;
            }

            let nowLikeCount = tweets[0].favorite_count;
            console.log("nowLikeCount:"+nowLikeCount);

            if(nowLikeCount > prevLikeCount){

                processingTime = nowLikeCount * (ROTATE_TIME + STOP_TIME);

                //ここは1周目のときに通る
                if(prevLikeCount === -1){
                    startTime = new Date().getTime()
                    console.log("first like count:"+nowLikeCount)
                    obniz.display.clear(); // 画面を消去
                    obniz.display.print("like count:"+nowLikeCount);

                    // 音楽を再生する
                    servo01.angle(160.0);
                    await obniz.wait(150);
                    console.log("音楽スタート")
                    servo01.angle(30.0);

                    processingTime = 0;
                    prevLikeCount = nowLikeCount;
                    return;
                }

                //前のループの処理時間中だったらループを抜ける
                let nowTime = new Date().getTime();
                if(nowTime - (startTime + processingTime) < 0){
                    prevLikeCount = nowLikeCount;
                    return;
                }

                let diffLikeCount = nowLikeCount - prevLikeCount;
                startTime = new Date().getTime();
                console.log("like count:"+nowLikeCount);
                obniz.display.clear(); // 画面を消去
                obniz.display.print(`like added!`);
                obniz.display.print("like count:"+nowLikeCount);

                processingTime = diffLikeCount * (ROTATE_TIME + STOP_TIME);

                //likeの増加分だけ回す
                diffLikeCount = 3
                for(let i=0; i<diffLikeCount; i++){
                    led.on();
                    servo02.angle(100.0);
                    await obniz.wait(150);
                    servo02.angle(60.0);
                    led.off();
                    await obniz.wait(STOP_TIME);
                }
                processingTime = 0;
                prevLikeCount = nowLikeCount;

            }else{
                obniz.display.clear(); // 画面を消去
                obniz.display.print(`not like!`);
                prevLikeCount = nowLikeCount;
            }

        });

    }, 10000);
}