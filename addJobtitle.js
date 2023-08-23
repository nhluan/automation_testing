const { Builder, By, Key, until, Select } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const chromePath = path.join(__dirname, "drivers", "chromedriver");

const options = new chrome.Options();
options.addArguments("--start-maximized");

const driver = new Builder()
  .forBrowser("chrome")
  .setChromeOptions(options)
  .build();

async function waitForElement(selector, timeout = 1000) {
  try {
    let element = await driver.wait(
      until.elementLocated(By.css(selector)),
      timeout
    );
    return element;
  } catch (error) {
    console.log(`Phần tử không tồn tại sau ${timeout}ms:`, error.message);
    return null;
  }
}

// Hàm đăng nhập
async function login(username, password) {
  await driver.get(
    "http://localhost/orangehrm-4.5/symfony/web/index.php/auth/login"
  );

  const usernameInput = await waitForElement("#txtUsername");
  await usernameInput.sendKeys(username);

  const passwordInput = await waitForElement("#txtPassword");
  await passwordInput.sendKeys(password);

  const loginButton = await waitForElement("#btnLogin");
  await loginButton.click();

  const successMessage = await waitForElement("#welcome");
  const message = await successMessage.getText();
  console.log("Login status:", message);
}

async function executeTest() {
  await login("admin", "10072002@Aw");
  const dataPath = path.join(__dirname, "data/addJobTitle.csv");
  const resultPath = path.join(__dirname, "data/addJobTitle-result.csv");

  const dataFile = fs.createReadStream(dataPath);
  const resultFile = fs.createWriteStream(resultPath);
  const headerResult = "TC;Input;Expected output;Actual output\n";
  resultFile.write(headerResult);

  const lineReader = readline.createInterface({
    input: dataFile,
    crlfDelay: Infinity,
  });

  let index = 1;
  let isFirstLine = true;
  let isPass = true;

  for await (const line of lineReader) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }
    const values = line.split(",");
    console.log(values[0], values[1], values[2], values[3], values[4]);
    // console.log("value 7", values[7]);

    const result = [];
    result.push(
      `#${index};${values[0]}|${values[1]}|${values[2]}|${values[3]};${values[4]}`
    );
    console.log("result", result);
    await driver.findElement(By.css("#menu_admin_viewAdminModule > b")).click();
    await driver.findElement(By.id("menu_admin_Job")).click();
    await driver.findElement(By.id("menu_admin_viewJobTitleList")).click();

    await driver.findElement(By.css("#btnAdd")).click();

    const jobTitleElement = await driver.findElement(
      By.id("jobTitle_jobTitle")
    );
    jobTitleElement.clear();
    jobTitleElement.sendKeys(`${values[0]}`);

    const jobDescriptionElement = await driver.findElement(
      By.id("jobTitle_jobDescription")
    );
    jobDescriptionElement.clear();
    jobDescriptionElement.sendKeys(`${values[1]}`);

    if (values[2] != "") {
      const filePath = path.join(__dirname, "data", "file", `${values[2]}`);
      const formattedPath = filePath.replace(/\\/g, "\\\\");
      const fileInput = await driver.findElement(By.css("#jobTitle_jobSpec"));
      fileInput.sendKeys(formattedPath);
    }

    const noteElement = await driver.findElement(By.id("jobTitle_note"));
    noteElement.clear();
    noteElement.sendKeys(`${values[3]}`);
    await driver.findElement(By.id("btnSave")).click();
    let titleMessage = await driver.findElements(
      By.css("#frmSavejobTitle > fieldset > ol > li:nth-child(1) > span")
    );

    if (titleMessage) {
      for (let i = 0; i < titleMessage.length; i++) {
        let text = await titleMessage[i].getText();
        console.log("titleMessage", i, ":", text);
        result.push("Input title: " + text);
      }
    }

    await driver.sleep(1000);

    try {
      let isValidateFile = await waitForElement(
        "#frmList_ohrmListComponent > div.message.success.fadable"
      );
      if (isValidateFile) {
        console.log("CHEKC");
        // await driver.get("http://localhost/orangehrm-4.5/");
        let text = await isValidateFile.getText();
        console.log("isSuccess:", text);
        result.push(text);
      }
    } catch (error) {
      console.log("Phần tử không tồn tại:", error.message);
    }

    try {
      let isValidateFile = await waitForElement(
        "#saveHobTitle > div.inner > div"
      );
      if (isValidateFile) {
        console.log("CHEKC");
        // await driver.get("http://localhost/orangehrm-4.5/");
        let text = await isValidateFile.getText();
        console.log("isERROR:", text);
        result.push(text);
      }
    } catch (error) {
      console.log("Phần tử không tồn tại:", error.message);
    }

    await driver.sleep(1000);
    index++;
    const resultString = result.join(";");
    resultFile.write(resultString + "\n");
  }

  console.log("index", index);
  resultFile.end();
}

async function runTest() {
  try {
    await driver.manage().window().maximize();
    await executeTest();
    // await driver.sleep(100);
  } finally {
    await driver.quit();
  }
}

runTest();
