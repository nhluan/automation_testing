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
  const dataPath = path.join(__dirname, "data/addEmployee.csv");
  const resultPath = path.join(__dirname, "data/addEmployee-result.csv");

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
      `#${index};${values[0]}|${values[1]}|${values[2]}|${values[3]}|${values[4]};${values[5]}`
    );
    console.log("result", result);
    await driver.findElement(By.css("#menu_pim_viewPimModule > b")).click();
    await driver.findElement(By.id("menu_pim_addEmployee")).click();
    await driver.findElement(By.linkText("Add Employee")).click();

    await driver.findElement(By.id("firstName")).click();
    await driver.findElement(By.name("firstName")).sendKeys(values[0]);
    await driver.findElement(By.name("middleName")).sendKeys(values[1]);
    await driver.findElement(By.name("lastName")).sendKeys(values[2]);

    await driver
      .findElement(By.id("employeeId"))
      .sendKeys(Key.chord(Key.CONTROL, "a"), Key.DELETE);
    await driver.findElement(By.id("employeeId")).sendKeys(values[3]);

    if (values[4] != "") {
      console.log("====values[4]::", values[2]);
      const filePath = path.join(__dirname, "data", "file", `${values[4]}`);
      console.log("====filePath::", filePath);
      const formattedPath = filePath.replace(/\\/g, "\\\\");
      console.log("====filePath::", formattedPath);
      const fileInput = await driver.findElement(By.css("#photofile"));
      fileInput.sendKeys(formattedPath);
    }

    await driver.findElement(By.css("#btnSave")).click();
    await driver.sleep(500);
    console.log("check suscess0", isSuccess);

    let firstnameMessage = await driver.findElements(
      By.css(
        "#frmAddEmp > fieldset > ol > li.line.nameContainer > ol > li:nth-child(1) > span"
      )
    );
    if (firstnameMessage.length > 0) {
      isSuccess = false;

      console.log("succsess in first file", isSuccess);
      for (let i = 0; i < firstnameMessage.length; i++) {
        let text = await firstnameMessage[i].getText();
        console.log("firstnameMessage", i, ":", text);
        result.push("Input firstname: " + text);
      }
    }
    console.log("check suscess1", isSuccess);

    let lastNameMessage = await driver.findElements(
      By.css(
        "#frmAddEmp > fieldset > ol > li.line.nameContainer > ol > li:nth-child(3) > span"
      )
    );
    if (lastNameMessage.length > 0) {
      isSuccess = false;
      console.log("succsess in last", isSuccess);
      for (let i = 0; i < lastNameMessage.length; i++) {
        let text = await lastNameMessage[i].getText();
        console.log("lastNameMessage", i, ":", text);
        result.push("Input lastName: " + text);
      }
    }
    console.log("check suscess2", isSuccess);

    try {
      let isValidateFile = await waitForElement("#addEmployeeTbl > div");
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
    if (isSuccess) {
      result.push("saved successfully");
    }
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
