const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');


const root = './',
    exts = ['.jpg', '.png'],
    max = 5200000; // 5MB == 5242848.754299136

const options = {
    method: 'POST',
    hostname: 'tinypng.com',
    path: '/web/shrink',
    headers: {
        rejectUnauthorized: false,
        'Postman-Token': Date.now(),
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
            'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
    }
};

// 生成随机IP， 赋值给 X-Forwarded-For
function getRandomIP() {
    return Array.from(Array(4)).map(() => parseInt(Math.random() * 255)).join('.')
}

function fileUpload1(img, cb) {
    let b;
    var req = https.request(options, function(res) {
        res.on('data', buf => {
            let obj
            try {
                obj = JSON.parse(buf.toString());
            } catch (e) {
                console.log(e)
                console.log('返回出错', buf.toString())
                return;
            }
            if (obj.error) {
                console.log(`[${img}]：压缩失败！报错：${obj.message}`);
            } else {
                fileUpdate1(img, obj, cb);
            }
        });
    });

    req.write(fs.readFileSync(img), 'binary');
    req.on('error', e => {
        if(!b) {
            b = true;
            cb();
        }
        console.error(e);
    });
    req.end();
}

function fileUpdate1(imgpath, obj, cb) {
    let b;
    let options = new URL(obj.output.url);
    let req = https.request(options, res => {
        let body = '';
        res.setEncoding('binary');
        res.on('data', function(data) {
            body += data;
        });

        res.on('end', function() {
            fs.writeFile(imgpath, body, 'binary', err => {
                if(!b) {
                    b = true;
                    cb();
                }
                if (err) return console.error(err);
                console.log(
                    `[${imgpath}] \n 压缩成功，原始大小-${obj.input.size}，压缩大小-${
                        obj.output.size
                    }，优化比例-${obj.output.ratio}`
                );
            });
        });
    });
    req.on('error', e => {
        if(!b) {
            b = true;
            cb();
        }
        console.error(e);
    });
    req.end();
}

function fileUpload(img) {
    var req = https.request(options, function(res) {
        res.on('data', buf => {
            let obj = JSON.parse(buf.toString());
            if (obj.error) {
                console.log(`[${img}]：压缩失败！报错：${obj.message}`);
            } else {
                fileUpdate(img, obj);
            }
        });
    });

    req.write(fs.readFileSync(img), 'binary');
    req.on('error', e => {
        console.error(e);
    });
    req.end();
}
// 该方法被循环调用,请求图片数据
function fileUpdate(imgpath, obj) {
    let options = new URL(obj.output.url);
    let req = https.request(options, res => {
        let body = '';
        res.setEncoding('binary');
        res.on('data', function(data) {
            body += data;
        });

        res.on('end', function() {
            fs.writeFile(imgpath, body, 'binary', err => {
                if (err) return console.error(err);
                console.log(
                    `[${imgpath}] \n 压缩成功，原始大小-${obj.input.size}，压缩大小-${
                        obj.output.size
                    }，优化比例-${obj.output.ratio}`
                );
            });
        });
    });
    req.on('error', e => {
        console.error(e);
    });
    req.end();
}


function findMetaFiles(dir) {
    const files = fs.readdirSync(dir);
    let metaFiles = [];

    files.forEach(function(file) {
        const filePath = path.join(dir, file);
        const fileStat = fs.lstatSync(filePath);

        if (fileStat.isDirectory()) {
            metaFiles = metaFiles.concat(findMetaFiles(filePath));
        } else if (filePath.endsWith('.png.meta')) {
            metaFiles.push(filePath);
        }
    });

    return metaFiles;
}
function findPngFiles(dir) {
    const files = fs.readdirSync(dir);
    let metaFiles = [];

    files.forEach(function(file) {
        const filePath = path.join(dir, file);
        const fileStat = fs.lstatSync(filePath);

        if (fileStat.isDirectory()) {
            metaFiles = metaFiles.concat(findPngFiles(filePath));
        } else if (filePath.endsWith('.png')) {
            metaFiles.push(filePath);
        }
    });

    return metaFiles;
}
// const metaFiles = findMetaFiles('D:\\code\\fairy_farm\\assets');
const metaFiles = findMetaFiles('D:\\code\\fairy_farm\\assets\\resources\\mainUI');
// const metaFiles = findMetaFiles('D:\\code\\fairy_farm\\assets\\resources\\cdn_res\\resource\\plists');
async function handle() {
    for (const metaFile of metaFiles) {
        const data = fs.readFileSync(metaFile, 'utf-8');
        const json = JSON.parse(data);
        // if(json && json.platformSettings && !json.platformSettings.android) {
        if(json && json.platformSettings) {
            json.platformSettings.android = {
                "formats": [
                    {
                        "name": "etc2_rgb",
                        "quality": "slow"
                    }
                ]
            }
        }
        fs.writeFileSync(metaFile, JSON.stringify(json, null, 2))
    }
    console.log('处理结束')
}
async function handleRev() {
    for (const metaFile of metaFiles) {
        const data = fs.readFileSync(metaFile, 'utf-8');
        const json = JSON.parse(data);
        if(json && json.platformSettings && json.platformSettings.android) {
            json.platformSettings = {
            }
        }
        fs.writeFileSync(metaFile, JSON.stringify(json, null, 2))
    }
    console.log('处理结束')
}

const pngFiles = findPngFiles('D:\\code\\fairy_farm\\assets');
async function handle1() {
    for (const metaFile of pngFiles) {
        // fileUpload(metaFile);
        // await new Promise((resolve, reject)=>{
        //     setTimeout(()=>{
        //         resolve();
        //     }, 1000)
        // })

        options.headers['X-Forwarded-For'] = getRandomIP();
        await new Promise((resolve)=>{
            fileUpload1(metaFile, ()=>{
                resolve();
            })
        })
    }
    console.log('处理结束')
}
// 批量使用tinypng压缩
// handle1();
// 还原函数
// handleRev();
// 处理函数
handle();