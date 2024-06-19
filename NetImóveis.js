const puppeteer = require('puppeteer');
const xlsx = require('xlsx');

async function scrape() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0'
  });

  let currentPage = 1;
  const maxPages = 100; // Defina o número máximo de páginas a serem visitadas
  const allData = [];

  const baseUrl = 'https://www.netimoveis.com/venda/espirito-santo/guarapari?transacao=venda&localizacao=BR-ES-guarapari---';

  while (currentPage <= maxPages) {
    const pageUrl = `${baseUrl}&pagina=${currentPage}`;

    await page.goto(pageUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('body');

    const data = await page.evaluate(() => {
      const enderecoElements = [...document.querySelectorAll('div.endereco')];
      const areaElements = [...document.querySelectorAll('div.caracteristica.area')];
      const quartoElements = [...document.querySelectorAll('div.caracteristica.quartos')];
      const vagaElements = [...document.querySelectorAll('div.caracteristica.vagas')];
      const banheiroElements = [...document.querySelectorAll('div.caracteristica.banheiros')];
      const precoElements = [...document.querySelectorAll('div.valor')];

      const getText = (element) => element ? element.textContent.trim() : 'N/A';

      const results = enderecoElements.map((_, index) => {
        const endereco = getText(enderecoElements[index]);
        const area = getText(areaElements[index]);
        const quartos = getText(quartoElements[index]);
        const vagas = getText(vagaElements[index]);
        const banheiros = getText(banheiroElements[index]);
        const preco = getText(precoElements[index]);

        return {
          endereco,
          area,
          quartos,
          vagas,
          banheiros,
          preco
        };
      });

      return results;
    });

    if (data.length > 0) {
      console.log(`Dados encontrados na página ${currentPage}:`, data);
      allData.push(...data);
    } else {
      console.log(`Nenhum dado encontrado na página ${currentPage}.`);
      break;
    }

    if (data.length < 14) {
      console.log(`Dados insuficientes na página ${currentPage}. Recolhendo mais dados.`);
      break;
    }

    console.log(`URL da página ${currentPage}: ${pageUrl}`);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const nextPageButton = await page.$('li.page-item-next, li[class*="next"]');
      if (nextPageButton) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          nextPageButton.click()
        ]);
      } else {
        console.log('Botão "Próxima página" não encontrado. Encerrando raspagem.');
        break;
      }
    } catch (error) {
      console.error('Erro ao navegar para a próxima página:', error);
      break;
    }

    currentPage++;
  }

  await browser.close();

  // Grava os dados no arquivo Excel
  const worksheet = xlsx.utils.json_to_sheet(allData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Dados Imóveis');
  xlsx.writeFile(workbook, 'dados_imoveis.odf');

  console.log('Dados gravados no arquivo dados_imoveis.xlsx');
}

scrape();
