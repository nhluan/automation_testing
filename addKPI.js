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
  const dataPath = path.join(__dirname, "data/addKPI.csv");
  const resultPath = path.join(__dirname, "data/addKPI-result.csv");

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
    await driver.findElement(By.css("#menu__Performance > b")).click();
    await driver.findElement(By.id("menu_performance_Configure")).click();
    await driver.findElement(By.id("menu_performance_searchKpi")).click();
    await driver.findElement(By.id("btnAdd")).click();

    let inputTitleJob = await driver.findElement(
      By.id("defineKpi360_jobTitleCode")
    );
    console.log("inputTitleJob", inputTitleJob);

    const selectElement = await driver.findElement(
      By.css("#defineKpi360_jobTitleCode")
    );
    const select = new Select(selectElement);

    await select.selectByVisibleText(`${values[0]}`);
    const kpiElement = await driver.findElement(
      By.css("#defineKpi360_keyPerformanceIndicators")
    );
    kpiElement.clear();
    kpiElement.sendKeys(`${values[1]}`);
    const minElement = await driver.findElement(
      By.css("#defineKpi360_minRating")
    );
    minElement.clear();
    minElement.sendKeys(`${values[2]}`);
    const maxElement = await driver.findElement(
      By.css("#defineKpi360_maxRating")
    );
    maxElement.clear();
    maxElement.sendKeys(`${values[3]}`);
    await driver.findElement(By.css("#saveBtn")).click();

    // driver.findElement({ id: "defineKpi360_jobTitleCode" }).then(
    //   function (webElement) {
    //     webElement
    //       .findElements(By.tagName("option"))
    //       .then(function (optionArray) {
    //         if (optionArray.length > 1) {
    //           optionArray[0]
    //             .getAttribute("value")
    //             .then(function (optionValue) {});
    //         }
    //       });
    //   },
    //   function (err) {}
    // );
    // inputTitleJob.click();
    // await inputTitleJob.clear();

    // await driver.findElement(By.linkText("Add Employee")).click();

    let kpiMessage = await driver.findElements(
      By.css("#searchKpi > fieldset > ol > li:nth-child(2) > span")
    );

    if (kpiMessage) {
      isPass = false;
      for (let i = 0; i < kpiMessage.length; i++) {
        let text = await kpiMessage[i].getText();
        console.log("kpiMessage", i, ":", text);
        result.push("Input KPI: " + text);
      }
    }

    let minMessage = await driver.findElements(
      By.css("#searchKpi > fieldset > ol > li:nth-child(3) > span")
    );

    if (minMessage) {
      isPass = false;
      for (let i = 0; i < minMessage.length; i++) {
        let text = await minMessage[i].getText();
        console.log("minMessage", i, ":", text);
        result.push("Input min rating: " + text);
      }
    }

    let maxMessage = await driver.findElements(
      By.css("#searchKpi > fieldset > ol > li:nth-child(4) > span")
    );

    if (maxMessage) {
      isPass = false;
      for (let i = 0; i < maxMessage.length; i++) {
        let text = await maxMessage[i].getText();
        console.log("maxMessage", i, ":", text);
        result.push("Input max rating: " + text);
      }
    }

    if (!kpiMessage.length && !minMessage.length && !maxMessage.length) {
      result.push("Successfully Saved");
    }

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
