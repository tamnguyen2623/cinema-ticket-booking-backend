const { Upload } = require("@aws-sdk/lib-storage");
const { s3 } = require("../config/awsConfig");

// upload file to s3 parallelly in chunks
module.exports.uploadFileController = async (file, key) => {
  // params for s3 upload
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ACL: "public-read",
    ContentType: file.mimetype,
  };

  try {
    // upload file to s3 parallelly in chunks
    const uploadParallel = new Upload({
      client: s3,
      queueSize: 5, // optional concurrency configuration
      partSize: 10 * 1024 * 1024, // optional size of each part
      leavePartsOnError: false, // optional manually handle dropped parts
      params,
    });

    // checking progress of upload
    uploadParallel.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });

    // Await upload completion and return the data
    const data = await uploadParallel.done(); // await here
    console.log("upload completed!", { data });
    return data; // return the data here
  } catch (error) {
    console.log(error);
    throw error; // Propagate the error to be handled by the caller
  }
};

module.exports.uploadMultipleFiles = async (files) => {
  const uploadedFiles = {};

  for (const file of files) {
    const fileName = Date.now().toString() + "-" + file.originalname;
    // const fileStream = fs.createReadStream(file.path);
    console.log("upload file: " + fileName);
    try {
      const uploadedFile = await this.uploadFileController(file, fileName);
      // log uploadedFile is undefined
      uploadedFiles[file.fieldname] = process.env.CLOUD_FRONT+fileName;
    } catch (error) {
      console.error("Error during file upload:", error);
      throw error;
    }
  }

  return uploadedFiles;
};
