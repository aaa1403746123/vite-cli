#!/usr/bin/env node

// This example shows specifying the command arguments using argument() function.

const { Command } = require('commander'); // (normal include)
const program = new Command();
const chalk = require('chalk');
const path=require('path')
const {
  version,
} = require('../package.json');
const mapActions = {
    create: {
      alias: 'c',
      description: 'create a project',
      examples: [
        'tdsp-cli create <project-name>',
      ],
    },
    config: {
      alias: 'conf',
      description: 'config project variable',
      examples: [
        'tdsp-cli config set <k><v>',
        'tdsp-cli config get <k>',
      ],
    },
    '*': {
      alias: '',
      description: 'command not found',
      examples: [],
    },
  };

// 配置命令
Reflect.ownKeys(mapActions).forEach((action) => {
    program
      .command(action) // 配置命令的名字
      .alias(mapActions[action].alias) // 命令的别名
      .description(mapActions[action].description) // 命令对应的描述
      .action(() => {
        // 访问不到对应的命令 就打印找不到命令
        if (action === '*') {
          console.log(chalk.cyan(mapActions[action].description));
        } else {
          // 截取命令
          // td-cli create xxx // [node,td-cli,create,xxx]
          require(path.resolve(__dirname,`../lib/${action}`))(...process.argv.slice(3));
        }
      });
  });
// 监听用户的help事件
program.on('--help', () => {
    console.log('\nExamples:');
    Reflect.ownKeys(mapActions).forEach((action) => {
      mapActions[action].examples.forEach((example) => {
        console.log(chalk.cyan(`${example}`));
      });
    });
  });

program.version(version).parse(process.argv);