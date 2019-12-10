var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var morgan = require("morgan");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var User = require("./models/user");
var Comment = require("./models/comment");
var News = require("./models/news");
var Order = require("./models/order");
var Product = require("./models/product");
var port = process.env.PORT || 8080;
var superSecret = "meannhom10";
var nodemailer = require("nodemailer");
var passport = require("passport");
var FacebookStrategy = require("passport-facebook").Strategy;
var GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/mydb", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

var transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // upgrade later with STARTTLS
  auth: {
    user: "hottest1342@gmail.com",
    pass: "Test123@"
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log("Server is ready to take our messages");
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, content-type, Authorization"
  );
  next();
});

app.use(morgan("dev"));

app.get("/", function(req, res) {
  res.send("Hello World!");
});

var apiRouter = express.Router();

app.use("/api", apiRouter);

// Todo: FB && GG passport
apiRouter.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);
apiRouter.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: "/err"
  }),
  (req, res) => {
    const token = jwt.sign(
      {
        id: req.user._id,
        facebookId: req.user.facebookId,
        name: req.user.name
      },
      superSecret,
      {
        expiresIn: "6000s"
      }
    );
    console.log("token", token);
    console.log("user", req.user);
    res.redirect(`http://localhost:3000?token=${token}`);
  }
);

apiRouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile"]
  })
);

apiRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/err"
  }),
  (req, res) => {
    const token = jwt.sign(
      {
        id: req.user._id,
        googleId: req.user.googleId,
        name: req.user.name
      },
      superSecret,
      {
        expiresIn: "6000s"
      }
    );
    // ["name", "email", "_id"]
    console.log("token", token);
    console.log("user", req.user);
    res.redirect(`http://localhost:3000?token=${token}`);
  }
);

passport.use(
  new FacebookStrategy(
    {
      clientID: "710089086150219",
      clientSecret: "2bb3d1c43355bce596c1d904e337e846",
      callbackURL: "http://localhost:8080/api/facebook/callback",
      profileFields: ["id", "displayName", "photos"]
    },
    function(accessToken, refreshToken, profile, done) {
      console.log(profile);

      User.findOne({ facebookId: profile.id }, (err, user) => {
        if (err) {
          return done(err);
        }

        if (!user) {
          const newUser = new User({
            facebookId: profile.id,
            name: profile.displayName,
            avatar: profile.photos[0].value,
            accessToken: accessToken
          });
          var user = newUser.save(function(err) {
            if (err) {
              throw err;
            }
            return done(null, newUser);
          });
        } else return done(null, user);
      });
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID:
        "120383357685-per2oneqi8gloo9tlova866ttlfbte9j.apps.googleusercontent.com",
      clientSecret: "Xwflhmr7CsCvH32eWDCrPbUc",
      callbackURL: "http://localhost:8080/api/google/callback",
      passReqToCallback: true
    },
    function(request, accessToken, refreshToken, profile, done) {
      console.log("profile", profile);

      User.findOne({ googleId: profile.id }, (err, user) => {
        if (err) {
          return done(err);
        }

        if (user) {
          return done(null, user);
        } else {
          const newUser = new User({
            googleId: profile.id,
            name: profile.displayName,
            avatar: profile.photos[0].value,
            accessToken: accessToken
          });
          newUser.save(function(err) {
            if (err) {
              throw err;
            }
            return done(null, newUser);
          });
        }
      });
    }
  )
);
// Todo: End passport
/*------------------Authentication--------------------*/
apiRouter.route("/register").post(function(req, res) {
  var user = new User();

  user.name = req.body.name;
  user.email = req.body.email;
  user.password = req.body.password;
  if (req.body.role) {
    user.role = req.body.role;
  }

  user.save(function(err) {
    if (err) {
      if (err.code === 11000) {
        console.log(err);
        return res.json({
          success: false,
          message: "A user with that email already extists."
        });
      } else return res.send(err);
    }
    console.log(user);

    var token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email
      },
      superSecret,
      {
        expiresIn: "6000s"
      }
    );
    res.json({
      success: true,
      message: "Register successfully!",
      token: token
    });
  });
});

apiRouter.route("/login").post(function(req, res) {
  User.findOne({
    email: req.body.email
  })
    .select("_id name email password")
    .exec(function(err, user) {
      if (err) return res.send(err);

      if (!user) {
        res.json({
          success: false,
          message: "Wrong username or password!"
        });
      } else if (user) {
        var validPassword = user.comparePassword(req.body.password);

        if (!validPassword) {
          res.json({
            success: false,
            message: "Wrong username or password!"
          });
        } else {
          console.log("user", user);
          var token = jwt.sign(
            {
              id: user._id,
              name: user.name,
              email: user.email
            },
            superSecret,
            {
              expiresIn: "2000s"
            }
          );
          res.json({
            success: true,
            message: "Login successfully!",
            token: token
          });
        }
      }
    });
});

// get product
apiRouter.route("/send-mail").post(async function(req, res) {
  const { email, address, phoneNumber, name } = req.body.info;
  const { product, total } = req.body;
  console.log("email", email);
  console.log("address", address);
  console.log("phoneNumber", phoneNumber);
  console.log("name", name);
  console.log("product", JSON.stringify(product));
  console.log("total", JSON.stringify(total));
  try {
    let info = await transporter.sendMail({
      from: "hottest1342@gmail.com",
      to: email,
      subject: "Just Shop xác nhận đơn hàng",
      html: `<b>Chào ${name}!</b>
      <p>Cảm ơn bạn đã chọn mua hàng ở Just Shop</p>
      <p>Just Shop xin xác nhận đơn hàng của bạn như sau:</p>
      ${product.map(
        (i) =>
          `<p>Tên sản phẩm: ${i.name} - Giá: ${i.cost}đ - Số lượng: ${i.quality}</p>`
      )}
      <b>Tổng: ${total}đ</b>
      <p>Địa chỉ nhận hàng: ${address}</p>
      <p>Số điện thoại: ${phoneNumber}</p>
      <b>Vui lòng phản hồi email này để xác thực đơn hàng</b>`
    });
    res.json({
      success: true,
      message: `Vui lòng kiểm tra email để xác nhận đơn hàng`
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: `Gửi mail không thành công`
    });
  }
});

apiRouter.route("/check-active-token").get(function(req, res) {
  var token =
    req.body.token || req.query.token || req.headers["x-access-token"];
  if (token) {
    jwt.verify(token, superSecret, function(err, decode) {
      if (err) {
        return res.json({
          success: false,
          message: "Token expire"
        });
      } else {
        res.json({
          success: true,
          message: "Token verification successfully"
        });
      }
    });
  } else {
    return res.json({
      success: false,
      message: "Not have token"
    });
  }
});

// get product
apiRouter.route("/product").get(function(req, res) {
  Product.find(function(err, products) {
    if (err) return res.send(err);
    return res.json(products);
  });
});

apiRouter.route("/product/:id").get(function(req, res) {
  Product.findById(req.params.id, function(err, product) {
    if (err) return res.send(err);
    return res.json(product);
  });
});

//get comment
apiRouter.route("/comment").get(function(req, res) {
  Comment.find(function(err, comments) {
    if (err) return res.send(err);
    return res.json(comments);
  });
});

//get news
apiRouter.route("/news").get(function(req, res) {
  News.find(function(err, news) {
    if (err) return res.send(err);
    return res.json(news);
  });
});

apiRouter.route("/news/:id").get(function(req, res) {
  News.findById(req.params.id, function(err, news) {
    if (err) return res.send(err);
    return res.json(news);
  });
});

//get order
apiRouter.route("/order").get(function(req, res) {
  Order.find(function(err, orders) {
    if (err) return res.send(err);
    return res.json(orders);
  });
});

//------------Require token in header----
var apiAdmin = express.Router();

app.use("/admin", apiAdmin);
apiAdmin.use(function(req, res, next) {
  var token =
    req.body.token || req.query.token || req.headers["x-access-token"];
  if (token) {
    jwt.verify(token, superSecret, function(err, decode) {
      if (err) {
        return res.json({
          success: false,
          message: "Fail to authenticate with token"
        });
      } else {
        req.decode = decode;
        next();
      }
    });
  } else {
    return res.status(403).send({
      success: false,
      message: "No permission"
    });
  }
});

apiAdmin.route("/check-admin").post(function(req, res) {
  User.findById(req.decode.id, function(err, user) {
    if (err) return res.send(err);
    console.log(user);
    return res.json({ isAdmin: user.role === "Admin" });
  });
});

// CURD USER
apiAdmin
  .route("/users")
  .post(function(req, res) {
    var user = new User();

    user.name = req.body.name;
    user.email = req.body.email;
    user.password = req.body.password;
    user.phoneNumber = req.body.phoneNumber;
    user.address = req.body.address;
    user.avatar = req.body.avatar;

    user.save(function(err) {
      if (err) {
        if (err.code === 11000)
          return res.json({
            success: false,
            message: "A user with that email already extists."
          });
        else return res.send(err);
      }
      res.json({ message: "User created!" });
    });
  })
  .get(function(req, res) {
    User.find(function(err, users) {
      if (err) return res.send(err);
      return res.json(users);
    });
  });

apiAdmin.route("/users/me").get(function(req, res) {
  console.log("id", req.decode.id);
  User.findById(req.decode.id, function(err, users) {
    if (err) return res.send(err);
    return res.json(users);
  });
});

apiAdmin
  .route("/users/:id")
  .get(function(req, res) {
    User.findById(req.params.id, function(err, users) {
      if (err) return res.send(err);
      return res.json(users);
    });
  })
  .put(function(req, res) {
    User.findById(req.params.id, function(err, user) {
      if (err) return res.send(err);
      if (req.body.name) user.name = req.body.name;
      if (req.body.email) user.email = req.body.email;
      if (req.body.password) user.password = req.body.password;
      if (req.body.phoneNumber) user.phoneNumber = req.body.phoneNumber;
      if (req.body.address) user.address = req.body.address;
      if (req.body.avatar) user.avatar = req.body.avatar;
      if (req.body.role) user.role = req.body.role;

      user.save(function(err) {
        if (err) return res.send(err);
        res.json({ message: "User updated!" });
      });
    });
  })
  .delete(function(req, res) {
    User.remove({ _id: req.params.id }, function(err, user) {
      if (err) return res.send(err);
      res.json({ message: "Sucessfully delete!" });
    });
  });

//CURD COMMENT
apiAdmin.route("/comment").post(function(req, res) {
  var comment = new Comment();

  comment.productId = req.body.productId;
  comment.email = req.body.email;
  comment.senderName = req.body.senderName;
  comment.content = req.body.content;
  comment.feedback = req.body.feedback;

  comment.save(function(err) {
    if (err) return res.send(err);
    res.json({ message: "Comment created!" });
  });
});

apiAdmin
  .route("/comment/:id")
  .get(function(req, res) {
    Comment.findById(req.params.id, function(err, comment) {
      if (err) return res.send(err);
      return res.json(comment);
    });
  })
  .put(function(req, res) {
    Comment.findById(req.params.id, function(err, comment) {
      if (err) return res.send(err);
      if (req.body.productId) comment.productId = req.body.productId;
      if (req.body.email) comment.email = req.body.email;
      if (req.body.senderName) comment.senderName = req.body.senderName;
      if (req.body.content) comment.content = req.body.content;
      if (req.body.feedback) comment.feedback = req.body.feedback;

      comment.save(function(err) {
        if (err) return res.send(err);
        res.json({ message: "Comment updated!" });
      });
    });
  })
  .delete(function(req, res) {
    Comment.remove({ _id: req.params.id }, function(err, comment) {
      if (err) return res.send(err);
      res.json({ message: "Sucessfully delete!" });
    });
  });

//CURD NEWS
apiAdmin.route("/news").post(function(req, res) {
  var news = new News();

  news.name = req.body.name;
  news.content = req.body.content;
  news.image = req.body.image;

  news.save(function(err) {
    if (err) return res.send(err);
    res.json({ message: "News created!" });
  });
});

apiAdmin
  .route("/news/:id")
  .put(function(req, res) {
    News.findById(req.params.id, function(err, news) {
      if (err) return res.send(err);
      if (req.body.name) news.name = req.body.name;
      if (req.body.content) news.content = req.body.content;
      if (req.body.image) news.image = req.body.image;

      news.save(function(err) {
        if (err) return res.send(err);
        res.json({ message: "News updated!" });
      });
    });
  })
  .delete(function(req, res) {
    News.remove({ _id: req.params.id }, function(err, news) {
      if (err) return res.send(err);
      res.json({ message: "Sucessfully delete!" });
    });
  });

//CURD ORDER
apiAdmin.route("/order").post(function(req, res) {
  console.log(req.body);
  var order = new Order();

  order.name = req.body.name;
  order.address = req.body.address;
  order.phoneNumber = req.body.phoneNumber;
  order.listProduct = req.body.listProduct;
  order.total = req.body.total;
  order.save(function(err) {
    if (err) return res.send(err);
    res.json({
      success: true,
      message: "Order created!"
    });
  });
});
//TODO: review order with list product
apiAdmin
  .route("/order/:id")
  .get(function(req, res) {
    Order.findById(req.params.id, function(err, order) {
      if (err) return res.send(err);
      return res.json(order);
    });
  })
  .put(function(req, res) {
    Order.findById(req.params.id, function(err, order) {
      if (err) return res.send(err);
      if (req.body.name) order.name = req.body.name;
      if (req.body.address) order.address = req.body.address;
      if (req.body.phoneNumber) order.phoneNumber = req.body.phoneNumber;
      if (req.body.listProduct) order.listProduct = req.body.listProduct;

      order.save(function(err) {
        if (err) return res.send(err);
        res.json({ message: "Order updated!" });
      });
    });
  })
  .delete(function(req, res) {
    Order.remove({ _id: req.params.id }, function(err, order) {
      if (err) return res.send(err);
      res.json({ message: "Sucessfully delete!" });
    });
  });

//CURD PRODUCT
apiAdmin.route("/product").post(function(req, res) {
  var product = new Product();

  product.name = req.body.name;
  product.cost = req.body.cost;
  product.description = req.body.description;
  product.image1 = req.body.image1;
  product.image2 = req.body.image2;
  product.image3 = req.body.image3;

  product.save(function(err) {
    if (err) return res.send(err);
    res.json({ message: "Product created!" });
  });
});
//TODO: review product with list product
apiAdmin
  .route("/product/:id")
  .get(function(req, res) {
    Product.findById(req.params.id, function(err, product) {
      if (err) return res.send(err);
      return res.json(product);
    });
  })
  .put(function(req, res) {
    Product.findById(req.params.id, function(err, product) {
      if (err) return res.send(err);
      if (req.body.name) product.name = req.body.name;
      if (req.body.cost) product.cost = req.body.cost;
      if (req.body.number) product.number = req.body.number;
      if (req.body.description) product.description = req.body.description;
      if (req.body.image1) product.image1 = req.body.image1;
      if (req.body.image2) product.image2 = req.body.image2;
      if (req.body.image3) product.image3 = req.body.image3;
      if (req.body.image4) product.image4 = req.body.image4;

      product.save(function(err) {
        if (err) return res.send(err);
        res.json({ message: "Product updated!" });
      });
    });
  })
  .delete(function(req, res) {
    Product.remove({ _id: req.params.id }, function(err, product) {
      if (err) return res.send(err);
      res.json({ message: "Sucessfully delete!" });
    });
  });

// START THE SERVER
//====================
app.listen(port);
console.log(`Ready start: http://localhost:${port}`);
