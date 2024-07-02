const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs');

// Função para criar um atraso fixo de 24 segundos
function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

// Função para carregar cookies
async function loadCookies(page) {
  const cookiesPath = 'cookies.json';
  try {
    const cookiesString = fs.readFileSync(cookiesPath);
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
  } catch (err) {
    console.log('Nenhum cookie encontrado, continuando sem cookies');
  }
}

// Função para salvar cookies
async function saveCookies(page) {
  const cookiesPath = 'cookies.json';
  const cookies = await page.cookies();
  fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
}

// Função para obter um User-Agent aleatório
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A5341f Safari/604.1'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function scrape() {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Definir dimensões da janela de forma realista
  await page.setViewport({ width: 1280, height: 800 });

  // Configura o cabeçalho para simular uma solicitação de navegador
  await page.setExtraHTTPHeaders({
    'User-Agent': getRandomUserAgent(),
    'Accept-Language': 'en-US,en;q=0.9',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://www.google.com/'
  });

  // Carrega cookies se existir
  await loadCookies(page);

  let currentPage = 1;
  const maxPages = 100; // Defina o número máximo de páginas a serem visitadas

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Propriedades');

  // Adiciona cabeçalhos
  worksheet.addRow(['Endereço', 'Nome', 'Info', 'Preço']);

  while (currentPage <= maxPages) {
    // Atualiza a URL da página
    const pageUrl = `https://www.imovelweb.com.br/apartamentos-venda-pagina-${currentPage}-q-guarapari.html`;

    // Navega até a página desejada
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

    // Espera até que os elementos desejados estejam completamente carregados
    await page.waitForSelector('div.ThisLayoutContainer-sc-fxxd37-0.dIGsyp');

    // Simula o movimento do mouse e rolagem
    await page.mouse.move(Math.floor(Math.random() * 1280), Math.floor(Math.random() * 800));
    await page.mouse.wheel({ deltaY: Math.floor(Math.random() * 500) });

    // Adiciona cliques aleatórios em elementos da página
    const elements = await page.$$('a, button');
    if (elements.length > 0) {
      const element = elements[Math.floor(Math.random() * elements.length)];
      await element.click();
      await delay(Math.floor(Math.random() * 2000) + 500);
    }

    // Extrai os endereços, detalhes e preços das propriedades
    const properties = await page.evaluate(() => {
      const enderecoElements = [...document.querySelectorAll("div.LocationAddress-sc-ge2uzh-0.iylBOA.postingAddress")];
      const nomeElements = [...document.querySelectorAll("h2.LocationLocation-sc-ge2uzh-2.fziprF")];
      const infoElements = [...document.querySelectorAll("h3.PostingMainFeaturesBlock-sc-1uhtbxc-0.cHDgeO")];
      const precoElements = [...document.querySelectorAll("div.Price-sc-12dh9kl-3.geYYII")];

      return enderecoElements.map((addressElement, index) => {
        const nome = nomeElements[index]?.textContent.trim() || 'N/A';
        const info = infoElements[index]?.textContent.trim() || 'N/A';
        const preco = precoElements[index]?.textContent.trim() || 'N/A';

        return {
          Endereco: addressElement.textContent.trim(),
          Nome: nome,
          Info: info,
          Preco: preco
        };
      });
    });

    properties.forEach(property => {
      worksheet.addRow([property.Endereco, property.Nome, property.Info, property.Preco]);
    });

    if (properties.length === 0) {
      console.log(`Nenhum dado encontrado na página ${currentPage}. Encerrando a coleta.`);
      break;
    }

    console.log(`Dados coletados na página ${currentPage}`);
    currentPage++;

    // Adiciona um atraso fixo de 24 segundos entre as trocas de página
    await delay(24000);
  }

  // Salva cookies
  await saveCookies(page);

  // Salva o arquivo Excel
  await workbook.xlsx.writeFile('dados.xlsx');

  // Fecha o navegador
  await browser.close();
}

// Chama a função para iniciar a raspagem
scrape();
