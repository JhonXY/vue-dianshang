var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Goods = require('../models/goods');
var User = require('../models/users')

mongoose.connect('mongodb://127.0.0.1:27017/db_demo');

mongoose.connection.on("connected", function () {
  console.log("MongoDB connect success");
});

mongoose.connection.on("error", function () {
  console.log("MongoDB connect fail");
});

mongoose.connection.on("disconnected", function () {
  console.log("MongoDB connect disconnected");
});

// 查询商品列表
router.get("/list", function (req,res,next) {
  // 后台实现分页
  let page = parseInt(req.param("page")); //浏览器参数第几页
  let pageSize = parseInt(req.param("pageSize")); //当前一页多少个
  let sort = req.param("sort"); //前端给的用于判断升序（1）还是降序（-1）
  // 这里设置跳过的数据条数，第一页跳0，第二页跳掉一页的数据，实现分页，这也是分页的基本公式
  let skip = (page - 1)*pageSize;
  let params = {}; //限制存放
  // 实现区间数据输出
  let priceLevel = req.param("priceLevel");
  if (priceLevel != 10) {
    switch (priceLevel) {
      case '0':
        priceGt = 0;
        priceLte = 100;
        break;
      case '1':
        priceGt = 500;
        priceLte = 1000;
        break;
      case '2':
        priceGt = 1000;
        priceLte = 2000;
        break;
      default:
        break;
    }
    params = {
      // 条件查询
      salePrice:{
        $gt: priceGt,
        $lte: priceLte
      }
    }
  }

  // 数据库取到所有数据
  let goodsModel = Goods.find(params).skip(skip).limit(pageSize); //skip跳过多少条，并limit设置取出多少条,实现分页

  goodsModel.sort({'salePrice':sort}); //对金额进行排序
  goodsModel.exec(function (err,doc) {
    if (err) {
      res.json({
        status: '1',
        msg: err.message
      });
    } else {
      res.json({
        status: '0',
        msg: '',
        result: {
          count: doc.length,
          list: doc
        }
      })
    }
  })
})

//加入到购物车
router.post("/addCart", function (req,res,next) {
  let userId = req.cookies.userId;
  let productId = req.body.productId;
  if (userId){
    User.findOne({userId: userId}, function (err, userDoc) {
      if (err) {
        res.json ({
          status: "1",
          msg: err.message
        })
      } else {
        console.log("userDoc: " + userDoc);
        if (userDoc) {
          let goodsItem = '';
          // 遍历购物车
          userDoc.cartList.forEach(function (item) {
            // 原有的id等于传入的id，说明已经有了这个商品了，只需要数量加一就行
            if (item.productId == productId) {
              goodsItem = item;
              item.productNum ++;
            }
          })
          // goodsItem有值了，直接就只需保存需修改了的商品数就行
          if (goodsItem) {
            userDoc.save(function (err2, doc2){
              if (err2) {
                res.json ({
                  status: "1",
                  msg: err2.message
                })
              } else {
                res.json ({
                  status: "0",
                  msg: '',
                  result: 'suc'
                })
              }
            })
          } else {
            // 没有添加这个商品时在将这个商品的整个数据导入
            Goods.findOne ({productId: productId}, function (err1,doc) {
                    if (err1) {
                      res.json ({
                        status: "1",
                        msg: err1.message
                      })
                    } else {
                      if (doc) {
                        doc.productNum = 1;
                        doc.checked = 1;
                        userDoc.cartList.push(doc);
                        userDoc.save(function (err2, doc2){
                          if (err2) {
                            res.json ({
                              status: "1",
                              msg: err2.message
                            })
                          } else {
                            res.json ({
                              status: "0",
                              msg: '',
                              result: 'suc'
                            })
                          }
                        })
                      }
                    }
                  })
          }
        }
      }
    })
  } else {
    res.json ({
      status: "1",
      msg: '狗比你没登录',
      result: ''
    })
  }
})
module.exports = router
