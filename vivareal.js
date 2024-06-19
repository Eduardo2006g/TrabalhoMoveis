const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');

async function scrape() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Configura o cabeçalho para simular uma solicitação de navegador
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0'
  });

  let currentPage = 1;
  const maxPages = 193; // Defina o número máximo de páginas a serem visitadas

  const baseUrl = 'https://www.vivareal.com.br/venda/espirito-santo/guarapari/#onde=Brasil,Esp%C3%ADrito%20Santo,Guarapari,,,,,,BR%3EEspirito%20Santo%3ENULL%3EGuarapari,,,';

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Propriedades');

  // Adiciona cabeçalhos
  worksheet.addRow(['Endereço', 'Quartos', 'Área', 'Banheiros', 'Garagens', 'Preço']);

  while (currentPage <= maxPages) {
    // Navega até a página desejada
    await page.goto(`${baseUrl}&pagina=${currentPage}`, { waitUntil: 'domcontentloaded' });

    // Espera até que os elementos desejados estejam completamente carregados
    await page.waitForSelector('span.property-card__address');

    // Extrai os endereços, detalhes e preços das propriedades
    const properties = await page.evaluate(() => {
      const enderecoElements = [...document.querySelectorAll("span.property-card__address")];
        const quartoElements = [...document.querySelectorAll("li.property-card__detail-item.property-card__detail-room.js-property-detail-rooms")];
        const areaElements = [...document.querySelectorAll("li.property-card__detail-item.property-card__detail-area")];
        const banheiroElements = [...document.querySelectorAll("li.property-card__detail-item.property-card__detail-bathroom.js-property-detail-bathroom")];
        const garageElements = [...document.querySelectorAll("li.property-card__detail-item.property-card__detail-garage.js-property-detail-garages")];
        const precoElements = [...document.querySelectorAll("div.property-card__price.js-property-card-prices.js-property-card__price-small")];
      
        return enderecoElements.map((addressElement, index) => {
          const quartos = quartoElements[index]?.textContent.trim() || 'N/A';
          const area = areaElements[index]?.textContent.trim() || 'N/A';
          const banheiros = banheiroElements[index]?.textContent.trim() || 'N/A';
          const garagens = garageElements[index]?.textContent.trim() || 'N/A';
          const preco = precoElements[index]?.textContent.trim() || 'N/A';

          return {
            Endereco: addressElement.textContent.trim(),
            Quartos: quartos,
            Area: area,
            Banheiros: banheiros,
            Garagens: garagens,
            Preco: preco
          };
        });
      });

      properties.forEach(property => {
        worksheet.addRow([property.Endereco, property.Quartos, property.Area, property.Banheiros, property.Garagens, property.Preco]);
      });

    // Aguarda totalmente o carregamento da próxima página
    try {
      // Espera até que o botão "Próxima página" esteja disponível
      await page.waitForSelector('button[title="Próxima página"]');
      
      // Aguarda 3 segundos antes de clicar no botão "Próxima página"
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Clica no botão "Próxima página"
      await page.click('button[title="Próxima página"]');

      // Imprime a nova URL após clicar no botão "Próxima página"
      console.log('Nova URL:', page.url());
    } catch (error) {
      console.error('Erro ao navegar para a próxima página:', error);
      break; // Sai do loop se ocorrer um erro ao navegar
    }

    currentPage++;
  }

  // Salva o arquivo Excel
  await workbook.xlsx.writeFile('vivareal2.xlsx');

  // Fecha o navegador
  await browser.close();
}

// Chama a função para iniciar a raspagem
scrape();
