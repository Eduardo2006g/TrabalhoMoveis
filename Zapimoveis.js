const puppeteer = require('puppeteer');
const xlsx = require('xlsx');
const fs = require('fs');

async function scrape() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0'
  });

  const initialUrl = 'https://www.zapimoveis.com.br/venda/imoveis/es+guarapari/?__ab=rec-disc:control,exp-aa-test:control,novopos:control,super-high:new,olx:control,phone-page:control,off-no-hl:control&transacao=venda&onde=,Esp%C3%ADrito%20Santo,Guarapari,,,,,city,BR%3EEspirito%20Santo%3ENULL%3EGuarapari,-20.673893,-40.499984,&pagina=57';
  await page.goto(initialUrl, { waitUntil: 'domcontentloaded' });

  // Verificar se estamos na página correta procurando por um elemento específico
  try {
    await page.waitForSelector('h2.card__address', { timeout: 10000 });
    console.log("Página correta carregada.");
  } catch (error) {
    console.error("Página carregada incorreta, verifique o URL ou a configuração do site.");
    await browser.close();
    return;
  }

  async function autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  function waitForTimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function collectData(page) {
    await autoScroll(page);
    await waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const addressElements = document.querySelectorAll('h2.card__address');
      const streetElements = document.querySelectorAll('p.card__street');
      const priceElements = document.querySelectorAll('div.listing-price');
      const floorSizeElements = document.querySelectorAll('p[itemprop="floorSize"]');
      const numberOfRoomsElements = document.querySelectorAll('p[itemprop="numberOfRooms"]');
      const numberOfBathroomsTotalElements = document.querySelectorAll('p[itemprop="numberOfBathroomsTotal"]');
      const numberOfParkingSpacesElements = document.querySelectorAll('p[itemprop="numberOfParkingSpaces"]');

      const addresses = Array.from(addressElements, element => element.textContent.trim());
      const streets = Array.from(streetElements, element => element.textContent.trim());
      const prices = Array.from(priceElements, element => element.textContent.trim());
      const floors = Array.from(floorSizeElements, element => element.textContent.trim());
      const rooms = Array.from(numberOfRoomsElements, element => element.textContent.trim());
      const baths = Array.from(numberOfBathroomsTotalElements, element => element.textContent.trim());
      const parkingSlots = Array.from(numberOfParkingSpacesElements, element => element.textContent.trim());

      return addresses.map((address, index) => ({
        address,
        street: streets[index] || '',
        price: prices[index] || '',
        floor: floors[index] || '',
        room: rooms[index] || '',
        baths: baths[index] || '',
        parking: parkingSlots[index] || '',
      }));
    });

    return data;
  }

  let pageCount = 0;
  const allData = [];

  try {
    while (pageCount < 62) {
      await page.waitForSelector('body');
      const data = await collectData(page);
      allData.push(...data);
      pageCount++;

      if (pageCount < 62) {
        const nextPageButton = await page.$('button[aria-label="Próxima página"]');
        if (nextPageButton) {
          await Promise.all([
            nextPageButton.click(),
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 })
          ]);
        } else {
          break;
        }
      }
    }
  } catch (error) {
    console.error("Erro durante a coleta de dados:", error);
  } finally {
    await browser.close();

    const filePath = "zapimoveis.xlsx";
    let existingData = [];

    // Ler os dados existentes se o arquivo já existir
    if (fs.existsSync(filePath)) {
      const workbook = xlsx.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      existingData = xlsx.utils.sheet_to_json(worksheet);
    }

    // Converter novos dados em formato adequado
    const newData = allData.map(item => ({
      "Endereço": item.address,
      "Rua": item.street,
      "Preço": item.price,
      "Área": item.floor,
      "Quartos": item.room,
      "Banheiros": item.baths,
      "Vagas": item.parking
    }));

    // Mesclar dados existentes com novos dados
    const combinedData = [...existingData, ...newData];

    // Remover duplicatas
    const uniqueData = Array.from(new Set(combinedData.map(JSON.stringify))).map(JSON.parse);

    // Criar uma nova planilha e adicionar os dados
    const workbook = xlsx.utils.book_new();
    const worksheetData = [
      ["Endereço", "Rua", "Preço", "Área", "Quartos", "Banheiros", "Vagas"],
      ...uniqueData.map(item => [
        item["Endereço"],
        item["Rua"],
        item["Preço"],
        item["Área"],
        item["Quartos"],
        item["Banheiros"],
        item["Vagas"]
      ])
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Imóveis");

    xlsx.writeFile(workbook, filePath);
    console.log("Arquivo 'zapimoveis.xlsx' criado com sucesso!");
  }
}

scrape();
