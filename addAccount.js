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

async function waitForElement(selector, timeout = 500) {
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
  const dataPath = path.join(__dirname, "data/addAccount.csv");
  const resultPath = path.join(__dirname, "data/addAccount-result.csv");

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
  let isSuccess = true;

  for await (const line of lineReader) {
    console.log("line", line);
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }
    const values = line.split(",");
    console.log(values[0], values[1], values[2], values[3], values[4]);

    const result = [];
    result.push(
      `#${index};${values[0]}|${values[1]}|${values[2]}|${values[3]}|${values[4]}|${values[5]};${values[6]}`
    );
    console.log("result", result);
    await driver.findElement(By.css("#menu_admin_viewAdminModule > b")).click();
    await driver.findElement(By.id("menu_admin_UserManagement")).click();
    await driver.findElement(By.id("btnAdd")).click();
    const employee = await driver.findElement(
      By.id("systemUser_employeeName_empName")
    );
    await employee.clear();
    await employee.sendKeys(values[1]);
    await employee.sendKeys(Key.ENTER);

    const usernameElement = await driver.findElement(
      By.css("#systemUser_userName")
    );
    usernameElement.clear();
    usernameElement.sendKeys(values[2]);

    const passwordElement = await driver.findElement(
      By.id("systemUser_password")
    );
    // passwordElement.clear();
    passwordElement.sendKeys(values[4]);

    const confirm = await driver.findElement(
      By.id("systemUser_confirmPassword")
    );
    // confirm.clear();
    confirm.sendKeys(values[5]);
    await driver.findElement(By.id("btnSave")).click();
    await driver.sleep(5000);

    // let nameMessage = await driver.findElement(
    //   By.css("#frmSystemUser > fieldset > ol > li:nth-child(2) > span")
    // );
    // console.log("message", nameMessage);
    // if (nameMessage) {
    //   isSuccess = false;
    //   console.log("succsess in last", isSuccess);
    //   for (let i = 0; i < nameMessage.length; i++) {
    //     let text = await nameMessage[i].getText();
    //     console.log("nameMessage", i, ":", text);
    //     result.push("Input name employee: " + text);
    //   }
    // }

    // // await driver.sleep(1000);

    // let usernameMessage = await driver.findElement(
    //   By.css("#frmSystemUser > fieldset > ol > li:nth-child(3) > span")
    // );
    // if (usernameMessage) {
    //   isSuccess = false;
    //   console.log("succsess in last", isSuccess);
    //   for (let i = 0; i < usernameMessage.length; i++) {
    //     let text = await usernameMessage[i].getText();
    //     console.log("usernameMessage", i, ":", text);
    //     result.push("Input username: " + text);
    //   }
    // }

    // console.log("check suscess2", isSuccess);

    // let passMessage = await driver.findElement(
    //   By.css("#frmSystemUser > fieldset > ol > li:nth-child(6) > span")
    // );
    // if (passMessage) {
    //   isSuccess = false;

    //   console.log("succsess in first file", isSuccess);
    //   for (let i = 0; i < passMessage.length; i++) {
    //     let text = await passMessage[i].getText();
    //     console.log("passMessage", i, ":", text);
    //     result.push("Input pasword: " + text);
    //   }
    // }
    // let confirmMessage = await driver.findElement(
    //   By.css("#frmSystemUser > fieldset > ol > li:nth-child(7) > span")
    // );
    // if (confirmMessage) {
    //   isSuccess = false;

    //   console.log("succsess in first file", isSuccess);
    //   for (let i = 0; i < confirmMessage.length; i++) {
    //     let text = await confirmMessage[i].getText();
    //     console.log("confirmMessage", i, ":", text);
    //     result.push("Input confirmPasword: " + text);
    //   }
    // }
    try {
      let isValidateFile = await waitForElement(
        "#frmSystemUser > fieldset > ol > li:nth-child(6) > span"
      );
      if (isValidateFile) {
        isSuccess = false;
        console.log("succsess in valid file", isSuccess);
        console.log("CHEKC");
        let text = await isValidateFile.getText();
        console.log("==isSuccess:", text);
        result.push(text);
      }
    } catch (error) {
      console.log("Phần tử không tồn tại:", error.message);
    }
    console.log("check suscess3", isSuccess);
    // return 0;
    // if (isSuccess) {
    //   result.push("saved successfully");
    // }
    index++;
    const resultString = result.join(";");
    resultFile.write(resultString + "\n");
    isSuccess = true;
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
