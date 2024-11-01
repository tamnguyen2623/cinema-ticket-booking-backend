const s3 = require('./awsConfig');
const fs = require('fs');

const uploadFileToS3 = (file, key) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file,
    ACL: 'public-read',
    ContentType: file.mimetype,
  };

  const options = { partSize: 10 * 1024 * 1024, queueSize: 10 }; // 10MB parts

  return new Promise((resolve, reject) => {
    s3.upload(params, options)
      .on('httpUploadProgress', (evt) => {
        console.log(`Progress: ${evt.loaded} / ${evt.total}`);
      })
      .send((err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
  });
};

const uploadMultipleFiles = async (files) => {

  for (const file of files) {
    const fileName = Date.now().toString() + "-" + file.originalname;
    const fileStream = fs.createReadStream(file.path);

    try {
      const uploadedFile = await uploadFileToS3(fileStream, fileName);
      uploadedFiles[file.fieldname] = uploadedFile.Location; 
    } catch (error) {
      console.error('Error during file upload:', error);
      throw error;
    }
  }

  return uploadedFiles;
};

module.exports = uploadMultipleFiles;
