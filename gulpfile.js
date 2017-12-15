/**
 * 海外配置文件入口
 * @Author   smy
 * @DateTime 2017-12-15T12:25:51+0800
 */

//海外一般配置文件
var normal = require('./config/gulpfile-normal.js');
//海外中东版配置文件
var arb = require('./config/gulpfile-arb.js');

normal();
arb();