  import mongoose  from "mongoose";
  import bcrypt from "bcryptjs";

  
  const userSchema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: [true, "Name is required"],
      },
      email: {
        type: String,
        required: [true, "Email is requried"],
        lowercase: true,
        unique: true,
        trim: true,
      },
      password: {
        type: String,
        required: [true, "Password is requried"],
        minlength: [6, "Password should be atleast 6 character long"],
      },
      cartItems: [
        {
          quantity: {
            type: Number,
            default: 1,
          },
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
        },
      ],
      role: {
        type: String,
        enum: ["customer", "admin"],
        default: "customer",
      },
    },
    { timestamps: true }
  );



  // pre-save hook to hash password before saving to dadabase
  userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (err) {
      next(err);
    }
  });


  userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
  };

  // Model<IUser> is the type of the model 
  const User = mongoose.model("User", userSchema);

  export { User };
