const fs = require('fs');
const path = require('path');

// 💡 园区双轨分拣任务表
const tasks = [
    { source: './_待入库_手卷', target: './sj_tiles', name: '手卷馆' },
    { source: './_待入库_立轴', target: './lz_tiles', name: '立轴馆' }
];

// 超级词典：自动把拼音转成漂亮的中文目录名
const dynastyMap = {
    'tang': '唐代',
    'song': '宋代',
    'yuan': '元代',
    'ming': '明代',
    'qing': '清代',
    'jinxiandai': '近现代',
    'xiandai': '现代'
};

console.log('🤖 正在启动“桐观”数字园区全自动分拣流水线...\n');

let totalSuccess = 0;

tasks.forEach(task => {
    // 自动建好两个收件箱和两个展厅大门（防呆设计，万一您忘了建，它帮您建）
    if (!fs.existsSync(task.source)) fs.mkdirSync(task.source, { recursive: true });
    if (!fs.existsSync(task.target)) fs.mkdirSync(task.target, { recursive: true });

    const items = fs.readdirSync(task.source);
    let count = 0;

    items.forEach(folderName => {
        const fullPath = path.join(task.source, folderName);
        
        if (fs.statSync(fullPath).isDirectory()) {
            const parts = folderName.split('_');
            
            if (parts.length >= 3) {
                const rawDynasty = parts[0];
                const rawAuthor = parts[1];
                const artworkName = parts.slice(2).join('_');

                const dynastyZh = dynastyMap[rawDynasty.toLowerCase()] || rawDynasty;
                const authorZh = rawAuthor; 

                const dynastyPath = path.join(task.target, rawDynasty);
                const authorPath = path.join(dynastyPath, rawAuthor);
                const artworkPath = path.join(authorPath, artworkName);

                // 1. 建朝代
                if (!fs.existsSync(dynastyPath)) {
                    fs.mkdirSync(dynastyPath, { recursive: true });
                    fs.writeFileSync(path.join(dynastyPath, 'chaodai.txt'), dynastyZh, 'utf8');
                }

                // 2. 建作者
                if (!fs.existsSync(authorPath)) {
                    fs.mkdirSync(authorPath, { recursive: true });
                    fs.writeFileSync(path.join(authorPath, 'zuozhe.txt'), authorZh, 'utf8');
                }

                // 3. 搬运画作
                try {
                    fs.renameSync(fullPath, artworkPath);
                    
                    // 4. 生成空白档案
                    fs.writeFileSync(path.join(artworkPath, 'title.txt'), artworkName, 'utf8');
                    fs.writeFileSync(path.join(artworkPath, 'desc.txt'), '请在此输入这幅传世名作的背景与赏析...', 'utf8');

                    console.log(`✅ [${task.name}入库] ${dynastyZh} -> ${authorZh} -> ${artworkName}`);
                    count++;
                } catch (err) {
                    console.error(`❌ 搬运失败: ${folderName} (请检查文件是否被占用)`);
                }
            } else {
                console.log(`⚠️ 跳过: ${folderName} (命名不符合 "朝代_作者_画名" 规则)`);
            }
        }
    });
    totalSuccess += count;
});

console.log(`\n🎉 园区流水线作业完毕！本次共为您自动分拣归档 ${totalSuccess} 幅作品。`);
console.log(`👉 接下来，请您去完善 desc.txt 档案，然后运行【一键更新图库.bat】即可开馆！`);