const { transporter } = require("../config/mailConfig");
const EGift = require("../models/EGiftCard");
const multer = require("multer");
const { uploadMultipleFiles } = require("./fileController");
const OwningCard = require("../models/OwningCard");
const User = require("../models/User");
const EgiftRecipient = require("../models/EgiftRecipient");
const { vnpay } = require("../config/vnpayConfig");
const { ProductCode, VnpLocale, dateFormat } = require("vnpay");

const upload = multer();

// Lấy danh sách tất cả eGift
exports.getAllEGifts = async (req, res) => {
  try {
    const egifts = await EGift.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: egifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy danh sách eGift chưa bị xóa (isDelete: false)
exports.getActiveEGifts = async (req, res) => {
  try {
    const egifts = await EGift.find({ isDelete: false }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: egifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy một eGift theo ID
exports.getEGiftById = async (req, res) => {
  try {
    const egift = await EGift.findById(req.params.id);
    if (!egift || egift.isDelete) {
      return res
        .status(404)
        .json({ success: false, message: "EGift not found" });
    }
    res.status(200).json({ success: true, data: egift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Tạo một eGift mới
exports.createEGift = async (req, res) => {
  upload.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async function (error) {
      if (error) {
        return res
          .status(500)
          .json({ success: false, message: "File upload error" });
      }

      if (!req.files["image"] || req.files["image"].length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No image file provided" });
      }

      try {
        const uploadedFiles = await uploadMultipleFiles([
          req.files["image"][0],
        ]);
        const egiftData = {
          name: req.body.name,
          image: uploadedFiles["image"],
          description: req.body.description,
          isDelete: false,
        };
        const egift = await EGift.create(egiftData);
        res.status(201).json({ success: true, data: egift });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  );
};

// Cập nhật eGift
exports.updateEGift = async (req, res) => {
  upload.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async function (error) {
      if (error) {
        return res
          .status(500)
          .json({ success: false, message: "File upload error" });
      }

      try {
        const egift = await EGift.findById(req.params.id);
        if (!egift) {
          return res
            .status(404)
            .json({ success: false, message: "EGift not found" });
        }

        if (req.files["image"] && req.files["image"].length > 0) {
          const uploadedFiles = await uploadMultipleFiles([
            req.files["image"][0],
          ]);
          egift.image = uploadedFiles["image"];
        }

        egift.name = req.body.name || egift.name;
        egift.description = req.body.description || egift.description;

        await egift.save();
        res.status(200).json({ success: true, data: egift });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  );
};

exports.updateIsDelete = async (req, res, next) => {
  EGift.updateOne({ _id: req.params.id }, req.body)
    .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
    .catch((error) => res.status(500).json({ message: error.message }));
};
// Xóa mềm eGift (đánh dấu isDelete là true)
exports.softDeleteEGift = async (req, res) => {
  try {
    const egift = await EGift.findById(req.params.id);
    if (!egift || egift.isDelete) {
      return res
        .status(404)
        .json({ success: false, message: "EGift not found" });
    }

    egift.isDelete = true;
    await egift.save();
    res.status(200).json({ success: true, message: "EGift marked as deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.sendEGiftToUser = async (req, res) => {
  try {
    const egiftId = req.params.id;
    const { email, fullName, message, balance, method } = req.body;
    if (!email || !fullName || !message || !balance) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const egift = await EGift.findById(egiftId);
    if (!egift || egift.isDelete) {
      return res
        .status(404)
        .json({ success: false, message: "EGift not found" });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const cardNumber = Math.floor(
      100000000 + Math.random() * 900000000
    ).toString();
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const recipient = await EgiftRecipient.create({
      fullName,
      email,
      message,
    });

    const owningCard = await OwningCard.create({
      user: user._id,
      egift: egift._id,
      egiftRecipient: recipient._id,
      cardNumber: cardNumber,
      expiryDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      ),
      status: "pending",
      balance: balance,
      pin: pin,
    });

    if (method === "momo") {
      const payUrl = await paymentWithMoMo({
        balance: balance,
        cardId: owningCard._id,
      });
      console.log(payUrl);
      res.json({ success: true, data: payUrl });
    } else if (method === "vnpay") {
      const payUrl = await paymentWithVNPAY(req, {
        balance: balance,
        cardId: owningCard._id,
      });
      res.json({ success: true, data: payUrl });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.callbackMoMo = async (req, res) => {
  try {
    const { resultCode: code, orderId: cardId } = req.query;

    if (!cardId) {
      return res.status(400).send("Card ID is invalid.");
    }

    const owningCard = await OwningCard.findById(cardId)
      .populate("user")
      .populate("egift")
      .populate("egiftRecipient");

    if (!owningCard) {
      return res.status(404).send("Owning card not found.");
    }

    if (code === "0") {
      owningCard.status = "active";
      await owningCard.save();
    } else {
      owningCard.status = "inactive";
      await owningCard.save();
    }

    const redirectUrl = `${process.env.FRONTEND_PREFIX}/egift/history`;

    console.log(owningCard)
    await sendMail({
      email: owningCard.egiftRecipient.email,
      fullname: owningCard.user.fullname,
      fullName: owningCard.egiftRecipient.fullName,
      message: owningCard.egiftRecipient.message,
      cardNumber: owningCard.cardNumber,
      balance: owningCard.balance,
      pin: owningCard.pin,
      image: owningCard.egift.image,
    });
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in callBackVnPay:", error);
    res.status(500).send("Server error");
  }
};

exports.callbackVNPAY = async (req, res) => {
  const { vnp_ResponseCode: code, vnp_TxnRef: cardId } = req.query;

  if (!cardId) {
    return res.status(400).send("Card ID is invalid.");
  }

  const owningCard = await OwningCard.findById(cardId)
    .populate("user")
    .populate("egift")
    .populate("egiftRecipient");

  if (!owningCard) {
    return res.status(404).send("Owning card not found.");
  }

  if (code === "00") {
    owningCard.status = "active";
    await owningCard.save();
  } else {
    owningCard.status = "inactive";
    await owningCard.save();
  }

  const redirectUrl = `${process.env.FRONTEND_PREFIX}/egift/history`;
  await sendMail({
    email: owningCard.egiftRecipient.email,
    fullname: owningCard.user.fullname,
    fullName: owningCard.egiftRecipient.fullName,
    message: owningCard.egiftRecipient.message,
    cardNumber: owningCard.cardNumber,
    balance: owningCard.balance,
    pin: owningCard.pin,
    image: owningCard.egift.image,
  });
  return res.redirect(redirectUrl);
};

const paymentWithVNPAY = async (req, data) => {
  const expireTime = new Date();
  expireTime.setMinutes(expireTime.getMinutes() + 10);

  const paymentUrl = vnpay.buildPaymentUrl({
    vnp_Amount: data.balance * 25000,
    vnp_IpAddr: req.socket.remoteAddress || "127.0.0.1",
    vnp_TxnRef: data.cardId.toString(),
    vnp_OrderInfo: `You are sending an E-Gift Card to your friend with balance is ${data.balance}`,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: `${process.env.BACKEND_PREFIX}/egift/egift-cards/vnpay/callback`,
    vnp_Locale: VnpLocale.VN,
    vnp_CreateDate: dateFormat(new Date()),
    vnp_ExpireDate: dateFormat(expireTime),
  });
  return paymentUrl;
};

const sendMail = async (data) => {
  console.log(data);
  const mailOptions = {
    from: process.env.MAIL_ACCOUNT,
    to: data.email,
    subject: `🎁 ${data.fullname} has sent you a special E-Gift Card!`,
    html: `
    <div style="background: linear-gradient(to right, #ece9e6, #ffffff); padding: 30px; text-align: center; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; background-color: #ffffff; border-radius: 12px; padding: 25px; margin: auto; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
        
        <h2 style="color: #333;">🎉 Hello, <span style="color: #007bff;">${data.fullName}</span>!</h2>
        <p style="color: #666; font-size: 16px;">You have received a special E-Gift Card from <strong>${data.fullname}</strong>! 🎁</p>

        <div style="background: #f8f9fa; border-left: 5px solid #007bff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #555; font-style: italic;">"${data.message}"</p>
        </div>

        <div style="background: #ffffff; border-radius: 10px; padding: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: left;">
          <h3 style="color: #333; text-align: center;">🎁 Your Gift Card Details</h3>
          <p style="color: #555;"><strong>💳 Card Number:</strong> ${data.cardNumber}</p>
          <p style="color: #555;"><strong>💰 Balance:</strong> $${data.balance}</p>
          <p style="color: #555;"><strong>🔑 PIN:</strong> ${data.pin}</p>
        </div>

        <img src="${data.image}" alt="EGift Card" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
      </div>
    </div>
  `,
  };
  await transporter.sendMail(mailOptions);
};

const paymentWithMoMo = async (data) => {
  const expireTime = new Date();
  expireTime.setMinutes(expireTime.getMinutes() + 10);
  var accessKey = process.env.MOMO_ACCESS_KEY;
  var secretKey = process.env.MOMO_SECRET_KEY;
  var orderInfo =
    "You are sending an E-Gift Card to your friend with balance is " +
    data.balance;
  var partnerCode = "MOMO";
  var redirectUrl =
    process.env.BACKEND_PREFIX + `/egift/egift-cards/momo/callback`;
  var ipnUrl = process.env.BACKEND_PREFIX + "/egift/egift-cards/momo/callback";
  var requestType = "payWithCC";
  var amount = data.balance * 25000 + "";
  var orderId = data.cardId.toString();
  var requestId = orderId;
  var extraData = "";
  var paymentCode = process.env.MOMO_PAYMENT_CODE;
  var orderGroupId = "";
  var autoCapture = true;
  var lang = "en";

  //before sign HMAC SHA256 with format
  //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
  var rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&extraData=" +
    extraData +
    "&ipnUrl=" +
    ipnUrl +
    "&orderId=" +
    orderId +
    "&orderInfo=" +
    orderInfo +
    "&partnerCode=" +
    partnerCode +
    "&redirectUrl=" +
    redirectUrl +
    "&requestId=" +
    requestId +
    "&requestType=" +
    requestType;

  const crypto = require("crypto");
  var signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = JSON.stringify({
    partnerCode: partnerCode,
    partnerName: "CINEMA",
    storeId: "MomoTestStore",
    requestId: requestId,
    amount: amount,
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: redirectUrl,
    ipnUrl: ipnUrl,
    lang: lang,
    requestType: requestType,
    autoCapture: autoCapture,
    extraData: extraData,
    orderGroupId: orderGroupId,
    signature: signature,
  });

  const https = require("https");
  return new Promise((resolve, reject) => {

    const options = {
      hostname: process.env.MOMO_HOST,
      port: 443,
      path: process.env.MOMO_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const req1 = https.request(options, (res1) => {
      let responseData = "";

      res1.on("data", (chunk) => {
        responseData += chunk;
      });

      res1.on("end", () => {
        try {
          const responseJson = JSON.parse(responseData);
          console.log("Response: ", responseJson);

          if (responseJson.payUrl) {
            resolve(responseJson.payUrl); // Trả về payUrl khi thành công
          } else {
            reject(new Error("Không tìm thấy payUrl trong phản hồi."));
          }
        } catch (error) {
          reject(new Error("Lỗi khi parse JSON từ phản hồi."));
        }
      });
    });

    req1.on("error", (e) => {
      reject(new Error(`Lỗi khi gửi request: ${e.message}`));
    });

    req1.write(requestBody);
    req1.end();
  })

};

exports.getMySentEgiftCards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).sort({ createdAt: -1 });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const egifts = await OwningCard.find({ user: user._id }).populate("egift").populate("egiftRecipient");

    const maskedEgifts = egifts.map((card) => {
      return {
        ...card._doc,
        cardNumber: "*".repeat(card.cardNumber.length - 4) + card.cardNumber.slice(-4),
        pin: "******",
      };
    });

    console.log(maskedEgifts);

    res.status(200).json({ success: true, data: maskedEgifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
