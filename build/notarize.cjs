const {notarize} =require("@electron/notarize");
module.exports= async function (context){
    const {electronPlatformName, appOutDir}=context
    if (electronPlatformName!=="darwin"){
        return;
    }
    const appPath=`${appOutDir}/${context.packager.appInfo.productFilename}.app`
    return await notarize({
        appBundleId:"com.rikkeisoft.automation.test.execution",
        appPath: appPath,
        appleApiKey:process.env.VITE_APPLE_KEY,
        appleApiKeyId: process.env.VITE_APPLE_KEY_ID,
        appleApiIssuer:process.env.VITE_APPLE_ISSUER_ID,
    })
}
