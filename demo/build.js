const fs = require('fs');
const path = require('path');

const tilesDir = './tiles'; // 你的图库根目录
let artworks = [];

console.log('🤖 正在启动私人美术馆自动化排版引擎（终极无限极分类版）...');

if (!fs.existsSync(tilesDir)) {
    console.error(`❌ 错误：找不到 ${tilesDir} 文件夹，请确认脚本放在与 tiles 同级的目录下。`);
    process.exit(1);
}

// ==========================================
// 核心：带有“智能字典”和“分类继承”的递归扫描
// parentCategory 用来记住上一层/上几层的中文名拼接
// ==========================================
function scanDirectory(currentPath, parentCategory = "") {
    const items = fs.readdirSync(currentPath);
    
    // 过滤出子目录，并按自然数字顺序排序（比如 01, 02, 10）
    const subDirs = items.filter(f => fs.statSync(path.join(currentPath, f)).isDirectory());
    subDirs.sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));

    let isArtwork = false;
    let isMultiPart = false;
    let partFolders = subDirs.filter(f => f.startsWith('part_'));

    // 判断当前目录是否是画作的终点
    if (partFolders.length > 0) {
        isArtwork = true;
        isMultiPart = true;
    } else if (items.includes('ImageProperties.xml')) {
        isArtwork = true;
    }

    if (isArtwork) {
        // 🎯 命中画作！开始提取信息
        let art = { desc: '', category: parentCategory || '未分类' };
        const folderName = path.basename(currentPath); 

        console.log(`🎨 发现作品: [${art.category}] ${folderName}`);

        // 1. 寻找画作的名字 (title.txt)
        const titlePath1 = path.join(currentPath, 'title.txt');
        const titlePath2 = path.join(currentPath, 'title.txt.txt'); // 防手滑后缀
        if (fs.existsSync(titlePath1)) {
            art.name = fs.readFileSync(titlePath1, 'utf8').trim();
        } else if (fs.existsSync(titlePath2)) {
            art.name = fs.readFileSync(titlePath2, 'utf8').trim();
        } else {
            art.name = folderName; // 没写 txt 就用英文文件夹名垫底
        }

        // 2. 寻找画作的介绍 (desc.txt)
        const descPath1 = path.join(currentPath, 'desc.txt');
        const descPath2 = path.join(currentPath, 'desc.txt.txt');
        if (fs.existsSync(descPath1)) {
            art.desc = fs.readFileSync(descPath1, 'utf8').trim();
        } else if (fs.existsSync(descPath2)) {
            art.desc = fs.readFileSync(descPath2, 'utf8').trim();
        } else {
            art.desc = '暂无作品介绍';
        }

        // 3. 将 Windows 物理路径转为安全的 Web 相对路径
        let webPath = currentPath.replace(/\\/g, '/').replace(/^\.\//, '');
        if (!webPath.endsWith('/')) webPath += '/';

        // 4. 解析 XML 获取尺寸和切片
        if (isMultiPart) {
            art.folder = [];
            let totalWidth = 0;
            let finalHeight = 0;
            partFolders.forEach(part => {
                const xmlPath = path.join(currentPath, part, 'ImageProperties.xml');
                if (fs.existsSync(xmlPath)) {
                    const xml = fs.readFileSync(xmlPath, 'utf8');
                    const w = parseInt(xml.match(/WIDTH="(\d+)"/i)[1]);
                    const h = parseInt(xml.match(/HEIGHT="(\d+)"/i)[1]);
                    totalWidth += w;
                    finalHeight = h;
                    art.folder.push({
                        tileSource: { type: 'zoomifytileservice', width: w, height: h, tilesUrl: `${webPath}${part}/` },
                        width: w
                    });
                }
            });
            art.width = totalWidth;
            art.height = finalHeight;
        } else {
            const xmlPath = path.join(currentPath, 'ImageProperties.xml');
            if (fs.existsSync(xmlPath)) {
                const xml = fs.readFileSync(xmlPath, 'utf8');
                art.width = parseInt(xml.match(/WIDTH="(\d+)"/i)[1]);
                art.height = parseInt(xml.match(/HEIGHT="(\d+)"/i)[1]);
                art.folder = webPath;
            }
        }
        
        artworks.push(art);

    } else {
        // 🚪 这是一个分类目录（比如 song, ming, wangximeng）
        let currentCatName = path.basename(currentPath); // 默认先拿英文名垫底
        
        // 🌟 超强词汇库：寻找这层目录的“中文身份证”
        if (currentPath !== tilesDir) { 
            const possibleNames = ['分类名.txt', 'chaodai.txt', 'category.txt', '朝代.txt', '分类.txt', 'zuozhe.txt', '作者.txt', 'author.txt', '画家.txt'];
            
            for (let name of possibleNames) {
                const p1 = path.join(currentPath, name);
                const p2 = path.join(currentPath, name + '.txt'); // 同样防手滑
                if (fs.existsSync(p1)) {
                    currentCatName = fs.readFileSync(p1, 'utf8').trim();
                    break; 
                } else if (fs.existsSync(p2)) {
                    currentCatName = fs.readFileSync(p2, 'utf8').trim();
                    break;
                }
            }
        }

        // 将父级分类和当前分类拼接起来（生成 "宋代 - 王希孟" 这样的神仙结构）
        let combinedCategory = parentCategory ? `${parentCategory} - ${currentCatName}` : currentCatName;
        if (currentPath === tilesDir) combinedCategory = ""; // 最外层根目录忽略

        // 带着组合好的中文名字，继续往下一层挖
        subDirs.forEach(subDir => {
            scanDirectory(path.join(currentPath, subDir), combinedCategory);
        });
    }
}

// 🚀 引擎点火！从图库最顶层开始向下地毯式扫描
scanDirectory(tilesDir);

// ==========================================
// 最终步骤：将数据组装成 HTML 认识的 JavaScript 格式并输出
// ==========================================
let jsCode = `var artworks = [\n` + artworks.map(art => {
    const folderStr = Array.isArray(art.folder) 
        ? `[\n${art.folder.map(p => `                    { tileSource: ${JSON.stringify(p.tileSource)}, width: ${p.width} }`).join(',\n')}\n                ]`
        : `"${art.folder}"`;

    return `            {
                category: "${art.category}",
                name: "${art.name}",
                width: ${art.width}, height: ${art.height},
                folder: ${folderStr},
                desc: \`${art.desc.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`
            }`;
}).join(',\n') + `\n        ];`;

// 写入文件
fs.writeFileSync('自动化图库配置.txt', jsCode, 'utf8');

console.log('\n✅ 扫描完毕，一切顺利！已为您生成【自动化图库配置.txt】。');
console.log(`📊 统计报告：本次共收录跨越多个分类的数字画卷 ${artworks.length} 幅！`);
console.log('👉 接下来，请将 txt 里的内容复制到你的 index.html 中即可。');