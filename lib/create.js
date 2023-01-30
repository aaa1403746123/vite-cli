const path = require('path');
const fs = require('fs-extra');
const chalk= require('chalk');
const Inquirer = require('inquirer');
const ora = require('ora');
const cwd = process.cwd();
const api = require('./api/index');
const downloadGitRepo = require('download-git-repo');
const util = require('util');
const ncp=require('ncp')
const MetalSmith = require('metalsmith'); // 遍历文件夹 
let { render } = require('consolidate').ejs;
render = util.promisify(render); // 包装渲染方法
const downloadDirectory = `${process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE']}/.template`;
class Creator {
    constructor(projectName, options) {
        this.projectName = projectName;
        this.options = options;
    }

    // 创建
    async create() {
        const isOverwrite = await this.handleDirectory();
        if(!isOverwrite) return;
        //获取可拉取的仓库列表
        await this.getCollectRepo();
    }
    // 处理是否有相同目录
    async handleDirectory() {
        const targetDirectory = path.join(cwd, this.projectName);
        // 如果目录中存在了需要创建的目录
        if (fs.existsSync(targetDirectory)) {
            if (this.options.force) {
                await fs.remove(targetDirectory);
            } else {
                let { isOverwrite } = await new Inquirer.prompt([
                    {
                        name: 'isOverwrite',
                        type: 'list',
                        message: '是否强制覆盖已存在的同名目录？',
                        choices: [
                            {
                                name: '覆盖',
                                value: true
                            },
                            {
                                name: '不覆盖',
                                value: false
                            }
                        ]
                    }
                ]);
                if (isOverwrite) {
                    await fs.remove(targetDirectory);
                } else {
                    console.log(chalk.red.bold('不覆盖文件夹，创建终止'));
                    return false;
                }
            }
        };
        return true;
    }
    async getCollectRepo() {
        const loading = ora('模版信息获取中...');
        loading.start();
        const {data: list} = await api.getRepoList({per_page: 100});
        loading.succeed();
        const collectTemplateNameList = list.map(item => item.name);
        let { choiceTemplateName } = await new Inquirer.prompt([
            {
                name: 'choiceTemplateName',
                type: 'list',
                message: '请选择模版',
                choices: collectTemplateNameList
            }
        ]);
        //下载模板
        this.downloadTemplate(choiceTemplateName);
    }
    async downloadTemplate(choiceTemplateName) {
        this.downloadGitRepo = util.promisify(downloadGitRepo);
        const loading = ora('正在拉取模版...');
        loading.start();
        const result=await this.download(this.projectName,choiceTemplateName)
        loading.succeed();
        if (!fs.existsSync(path.join(result, 'ask.js'))) {
            await ncp(result, path.resolve(__dirname,this.projectName));
          } else {
            // 1.让用户填信息
            await new Promise((resolve, reject) => {
              MetalSmith(__dirname) // 如果你传入路径 他默认会遍历当前路径下的src文件夹
                .source(result)
                .destination(path.resolve(this.projectName))
                .use(async (files, metal, done) => {
                  const args = require(path.join(result, 'ask.js'));
                  const obj = await Inquirer.prompt(args);
                  const meta = metal.metadata();
                  Object.assign(meta, obj);
                  delete files['ask.js'];
                  done();
                })
                .use((files, metal, done) => {
                  // 2.让用户天填写的信息去渲染模版
                  // metalsmith 只要是模版编译 都需要这个模块
                  const obj = metal.metadata();
                  Reflect.ownKeys(files).forEach(async (file) => {
                    // 这个是要处理的
                    if (file.includes('js') || file.includes('json')) {
                      let content = files[file].contents.toString(); // 文件内容
                      if (content.includes('<%')) {
                        content = await render(content, obj);
                        files[file].contents = Buffer.from(content); // 渲染
                      }
                    }
                  });
                  // 根据用户的输入 下载模版
                  // console.log(metal.metadata());
                  done();
                })
                .build((err) => {
                  if (err) {
                    reject();
                  } else {
                    resolve();
                  }
                });
            });
          }
        //下载完成提示
        this.showTemplateHelp();
    }
     // 模版使用提示
     showTemplateHelp() {
        console.log(`\r\nSuccessfully created project ${chalk.cyan(this.projectName)}`);
        console.log(`\r\n  cd ${chalk.cyan(this.projectName)}\r\n`);
        console.log("  npm install");
        console.log("  npm run dev\r\n");
        console.log(`
            \r\n
            ${chalk.green.bold('项目已成功创建')}
        `)
    }
    async download(projectName, choiceTemplateName){
        const templateUrl = `xq-cli/${choiceTemplateName}`;
        const dest = `${downloadDirectory}/${projectName}`;
        await  this.downloadGitRepo(templateUrl, dest);
        return dest;
      }

}
module.exports = async function (projectName, options) {
    const creator = new Creator(projectName, options);
    await creator.create();
}