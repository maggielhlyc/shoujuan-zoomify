const fs = require('fs');
const path = require('path');

const tilesDir = './tiles'; // 你的图库目录
let artworks = [];

console.log('🤖 正在启动私人美术馆自动化排版引擎...');

// 检查目录是否存在
if (!fs.existsSync(tilesDir)) {
    console.error(`❌ 错误：找不到 ${tilesDir} 文件夹，请确认脚本放在 index.html 同级目录下。`);
    process.exit(1);
}

// 获取文件夹并按数字/字母自然排序
const folders = fs.readdirSync(tilesDir).filter(f => fs.statSync(path.join(tilesDir, f)).isDirectory());

// 核心排序：确保 01, 02, 10, 11 按人类理解的数字顺序排列
folders.sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));

folders.forEach((folder, idx) => {
    const artPath = path.join(tilesDir, folder);
    console.log(`读取第 ${idx + 1} 幅作品: ${folder}`);
    
    let art = { name: folder, desc: '' };

    // 1. 读取 desc.txt (如果不存在则留空)
    const descPath = path.join(artPath, 'desc.txt');
    art.desc = fs.existsSync(descPath) ? fs.readFileSync(descPath, 'utf8').trim() : '暂无作品介绍';

    // 2. 判断单图还是多段 (寻找 part_ 文件夹)
    const subItems = fs.readdirSync(artPath).filter(f => fs.statSync(path.join(artPath, f)).isDirectory());
    const partFolders = subItems.filter(f => f.startsWith('part_')).sort();

    if (partFolders.length > 0) {
        art.folder = [];
        let totalWidth = 0;
        let finalHeight = 0;

        partFolders.forEach(part => {
            const xmlPath = path.join(artPath, part, 'ImageProperties.xml');
            if (fs.existsSync(xmlPath)) {
                const xml = fs.readFileSync(xmlPath, 'utf8');
                const w = parseInt(xml.match(/WIDTH="(\d+)"/i)[1]);
                const h = parseInt(xml.match(/HEIGHT="(\d+)"/i)[1]);
                totalWidth += w;
                finalHeight = h;
                art.folder.push({
                    tileSource: { type: 'zoomifytileservice', width: w, height: h, tilesUrl: `tiles/${folder}/${part}/` },
                    width: w
                });
            }
        });
        art.width = totalWidth;
        art.height = finalHeight;
    } else {
        const xmlPath = path.join(artPath, 'ImageProperties.xml');
        if (fs.existsSync(xmlPath)) {
            const xml = fs.readFileSync(xmlPath, 'utf8');
            art.width = parseInt(xml.match(/WIDTH="(\d+)"/i)[1]);
            art.height = parseInt(xml.match(/HEIGHT="(\d+)"/i)[1]);
            art.folder = `tiles/${folder}/`;
        } else {
            console.warn(`⚠️ 警告：${folder} 找不到 XML 文件，请确认已完成切图。`);
        }
    }
    artworks.push(art);
});

// 3. 格式化输出 (自动转义特殊字符)
let jsCode = `var artworks = [\n` + artworks.map(art => {
    const folderStr = Array.isArray(art.folder) 
        ? `[\n${art.folder.map(p => `                    { tileSource: ${JSON.stringify(p.tileSource)}, width: ${p.width} }`).join(',\n')}\n                ]`
        : `"${art.folder}"`;

    return `            {
                name: "${art.name}",
                width: ${art.width}, height: ${art.height},
                folder: ${folderStr},
                desc: \`${art.desc.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`
            }`;
}).join(',\n') + `\n        ];`;

fs.writeFileSync('自动化图库配置.txt', jsCode, 'utf8');
console.log('\n✅ 处理完成！已生成【自动化图库配置.txt】');
console.log(`目前共有作品：${artworks.length} 幅`);