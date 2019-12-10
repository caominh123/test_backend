var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var bcrypt = require("bcrypt-nodejs");
var UserSchema = new Schema({
  name: String,
  email: { type: String, required: false, index: { unique: true, sparse: true } },
  password: { type: String, required: false, select: true },
  role: { type: String, required: true, select: true, default: "User" },
  phoneNumber: { type: String, required: false, select: true },
  address: { type: String, required: false, select: true },
  avatar: {
    type: String,
    required: false,
    select: true,
    default: "https://icon-library.net/images/631929649c.svg.svg"
  },
  facebookId: {
    type: String,
    required: false,
    default: null
  },
  accessToken: { type: String, required: false, select: true },
  googleId: {
    type: String,
    required: false,
    default: null
  }
});

UserSchema.pre("save", function(next) {
  var user = this;
  if (!user.isModified("password")) return next();
  bcrypt.hash(user.password, null, null, function(err, hash) {
    if (err) return next(err);
    user.password = hash;
    next();
  });
});

UserSchema.methods.comparePassword = function(password) {
  var user = this;
  return bcrypt.compareSync(password, user.password);
};

module.exports = mongoose.model("User", UserSchema);
