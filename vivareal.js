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
  const maxPages = 42; // Limite de 10 trocas de página
  const baseUrl = 'https://www.vivareal.com.br/venda/espirito-santo/guarapari/apartamento_residencial/?transacao=venda&onde=,Esp%C3%ADrito%20Santo,Guarapari,,,,,city,BR%3EEspirito%20Santo%3ENULL%3EGuarapari,-20.673893,-40.499984,&tipos=apartamento_residencial&pagina=26';

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Propriedades');

  // Adiciona cabeçalhos
  worksheet.addRow(['Endereço', 'Área', 'Quartos', 'Banheiros', 'Preço']);

  // Função para simular o scroll do mouse
  async function autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100; // Distância a ser rolada a cada iteração
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100); // Intervalo entre os movimentos de scroll
      });
    });
  }

  while (currentPage <= maxPages) {
    try {
      // Navega até a página desejada
      console.log(`Acessando página ${currentPage}...`);
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });

      // Rola a página para carregar todos os elementos dinâmicos
      await autoScroll(page);

      // Espera até que os elementos desejados estejam completamente carregados
      await page.waitForSelector('section.card__location.overflow-hidden', { timeout: 60000 });

      // Extrai os endereços, detalhes e preços das propriedades
      const properties = await page.evaluate(() => {
        const enderecoElements = [...document.querySelectorAll("section.card__location.overflow-hidden")];
        const areaElements = [...document.querySelectorAll('p[itemprop="floorSize"]')];
        const quartoElements = [...document.querySelectorAll('p[itemprop="numberOfRooms"]')];
        const banheiroElements = [...document.querySelectorAll('p[itemprop="numberOfBathroomsTotal"]')];
        const precoElements = [...document.querySelectorAll('[data-cy="rp-cardProperty-price-txt"]')];
        
        return enderecoElements.map((addressElement, index) => ({
          Endereco: addressElement?.textContent.trim() || 'N/A',
          Area: areaElements[index]?.textContent.trim() || 'N/A',
          Quarto: quartoElements[index]?.textContent.trim() || 'N/A',
          Banheiro: banheiroElements[index]?.textContent.trim() || 'N/A',
          Preco: precoElements[index]?.textContent.trim() || 'N/A'
        }));
      });

      // Escreve as informações das propriedades no arquivo Excel
      properties.forEach(property => {
        worksheet.addRow([property.Endereco, property.Area, property.Quarto, property.Banheiro, property.Preco]);
      });

      console.log(`Dados extraídos da página ${currentPage}.`);

      // Verifica se o botão "Próxima página" está disponível antes de clicar
      const nextPageButton = await page.$('button[data-testid="next-page"]');
      if (nextPageButton) {
        await nextPageButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Pequena pausa para evitar problemas
      } else {
        console.log('Fim das páginas.');
        break;
      }
    } catch (error) {
      console.error(`Erro ao processar a página ${currentPage}:`, error);
      break;
    }

    currentPage++;
  }

  // Salva o arquivo Excel
  const fileName = 'VivaReal-AP-Compra-BH.xlsx';
  await workbook.xlsx.writeFile(fileName);
  console.log(`Dados salvos no arquivo: ${fileName}`);

  // Fecha o navegador
  await browser.close();
  console.log('Navegador fechado.');
}

scrape();
