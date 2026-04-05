const keywords = {
  'ALIMENTACAO': ['IFOOD', 'UBER EATS', 'MCDONALDS', 'RESTAURANTE', 'BURGER', 'MATEUS', 'EXTRA', 'CARREFOUR', 'PADARIA'],
  'TRANSPORTE': ['UBER', '99APP', 'POSTO', 'SHELL', 'IPIRANGA', 'BRMANIA', 'CONVENIENCIA'],
  'LAZER': ['NETFLIX', 'SPOTIFY', 'STEAM', 'PLAYSTATION', 'CINEMA', 'HOTEL'],
  'SAUDE': ['FARMACIA', 'DROGASIL', 'PAGUE MENOS', 'HOSPITAL', 'UNIMED'],
  'SERVICOS': ['ENEL', 'EQUATORIAL', 'SABESP', 'CONDOMINIO', 'VIVO', 'CLARO', 'TIM', 'INTERNET'],
  'INVESTIMENTO': ['RDB', 'INVESTIMENTO', 'APLICAÇÃO', 'NU INVEST', 'TESOURO']
};

export const matchCategory = (description, categories) => {
  // Limpeza: Remove números, caracteres especiais e espaços extras
  // "IFOOD *12345" vira "IFOOD"
  const cleanDesc = description
    .toUpperCase()
    .replace(/[0-9]/g, '') 
    .replace(/[*#-]/g, ' ')
    .trim();

  // 1. Busca por termos específicos
  for (const [categoryKey, terms] of Object.entries(keywords)) {
    if (terms.some(term => cleanDesc.includes(term))) {
      const found = categories.find(c => 
        c.name.toUpperCase().includes(categoryKey) || 
        categoryKey.includes(c.name.toUpperCase())
      );
      if (found) return found._id;
    }
  }

  // 2. Busca por nome direto da categoria
  for (const cat of categories) {
    if (cleanDesc.includes(cat.name.toUpperCase())) {
      return cat._id;
    }
  }

  return null;
};