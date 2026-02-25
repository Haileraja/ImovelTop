/**
 * Mozambique administrative data – Provinces → Cities → Bairros/Avenidas/Ruas.
 * Used for cascading Select fields in AddPropertyForm & PropertyFilters.
 */

export interface Bairro {
  nome: string;
  avenidas?: string[];
}

export interface Cidade {
  nome: string;
  bairros: Bairro[];
}

export interface Provincia {
  nome: string;
  cidades: Cidade[];
}

export const MOZAMBIQUE_LOCATIONS: Provincia[] = [
  {
    nome: 'Maputo Cidade',
    cidades: [
      {
        nome: 'Maputo',
        bairros: [
          { nome: 'Polana Cimento A', avenidas: ['Av. Julius Nyerere', 'Av. Kenneth Kaunda', 'Av. Friedrich Engels', 'Rua da Argélia'] },
          { nome: 'Polana Cimento B', avenidas: ['Av. Marginal', 'Av. Julius Nyerere', 'Rua de Dar-es-Salaam'] },
          { nome: 'Sommerschield', avenidas: ['Av. Kenneth Kaunda', 'Av. Kwame Nkrumah', 'Rua de Kassuende'] },
          { nome: 'Coop', avenidas: ['Av. Acordos de Lusaka', 'Av. Ahmed Sekou Touré', 'Av. Agostinho Neto'] },
          { nome: 'Malhangalene A', avenidas: ['Av. Eduardo Mondlane', 'Av. Salvador Allende', 'Av. Mártires de Mueda'] },
          { nome: 'Malhangalene B', avenidas: ['Av. Eduardo Mondlane', 'Av. Mártires de Inhaminga', 'Rua da Resistência'] },
          { nome: 'Alto Maé A', avenidas: ['Av. 24 de Julho', 'Av. Eduardo Mondlane', 'Rua Consiglieri Pedroso'] },
          { nome: 'Alto Maé B', avenidas: ['Av. 24 de Julho', 'Av. Guerra Popular', 'Rua do Bagamoyo'] },
          { nome: 'Central A (Baixa)', avenidas: ['Av. 25 de Setembro', 'Av. Samora Machel', 'Rua Marquês de Pombal', 'Praça dos Trabalhadores'] },
          { nome: 'Central B', avenidas: ['Av. 25 de Setembro', 'Rua da Imprensa', 'Av. Ho Chi Min'] },
          { nome: 'Central C', avenidas: ['Av. 25 de Setembro', 'Av. Filipe Samuel Magaia', 'Rua do Jardim'] },
          { nome: 'Chamanculo A', avenidas: ['Av. de Moçambique', 'Rua de Goa'] },
          { nome: 'Chamanculo B', avenidas: ['Av. de Moçambique', 'Av. Marien Ngouabi'] },
          { nome: 'Chamanculo C', avenidas: ['Av. de Angola', 'Av. de Moçambique'] },
          { nome: 'Chamanculo D', avenidas: ['Av. de Angola', 'Rua do Jardim'] },
          { nome: 'Xipamanine', avenidas: ['Av. de Angola', 'Av. Milagre Mabote'] },
          { nome: 'Minkadjuine', avenidas: ['Av. das Indústrias', 'Av. de Angola'] },
          { nome: 'Aeroporto A', avenidas: ['Av. Acordos de Lusaka', 'Rua do Aeroporto'] },
          { nome: 'Aeroporto B', avenidas: ['Av. de Moçambique', 'Rua do Aeroporto'] },
          { nome: 'Mafalala', avenidas: ['Av. Marien Ngouabi', 'Rua de Nachingwea'] },
          { nome: 'Maxaquene A', avenidas: ['Av. de Moçambique', 'Av. Albert Luthuli'] },
          { nome: 'Maxaquene B', avenidas: ['Av. Albert Luthuli', 'Av. das FPLM'] },
          { nome: 'Maxaquene C', avenidas: ['Av. das FPLM', 'Av. de Moçambique'] },
          { nome: 'Maxaquene D', avenidas: ['Av. das FPLM', 'Av. Albert Luthuli'] },
          { nome: 'Hulene A', avenidas: ['Av. de Moçambique', 'Av. Julius Nyerere'] },
          { nome: 'Hulene B', avenidas: ['Av. de Moçambique', 'EN1'] },
          { nome: 'Ferroviário', avenidas: ['Av. das FPLM', 'Rua do Ferroviário'] },
          { nome: 'Laulane', avenidas: ['Av. de Moçambique', 'Rua de Laulane'] },
          { nome: 'Mahotas', avenidas: ['Av. de Moçambique', 'Rua das Mahotas'] },
          { nome: '3 de Fevereiro', avenidas: ['Av. de Moçambique', 'EN1'] },
          { nome: 'Albazine', avenidas: ['EN1', 'Estrada de Marracuene'] },
          { nome: 'Magoanine A', avenidas: ['Circular de Maputo', 'Rua de Magoanine'] },
          { nome: 'Magoanine B', avenidas: ['Circular de Maputo'] },
          { nome: 'Magoanine C', avenidas: ['Circular de Maputo', 'Estrada de Marracuene'] },
          { nome: 'Zimpeto', avenidas: ['EN1', 'Circular de Maputo'] },
          { nome: 'Bagamoyo', avenidas: ['Av. de Moçambique'] },
          { nome: 'George Dimitrov', avenidas: ['Av. de Moçambique', 'Rua de George Dimitrov'] },
          { nome: 'Inhagoia A', avenidas: ['Av. de Moçambique'] },
          { nome: 'Inhagoia B', avenidas: ['Av. de Moçambique', 'Estrada de Marracuene'] },
          { nome: 'Jardim', avenidas: ['Av. 25 de Setembro', 'Rua do Jardim'] },
          { nome: 'Costa do Sol', avenidas: ['Av. Marginal', 'Estrada da Costa do Sol'] },
          { nome: 'Triunfo', avenidas: ['Av. Marginal', 'Estrada da Costa do Sol'] },
          { nome: 'Albasine', avenidas: ['EN1'] },
          { nome: 'Luis Cabral', avenidas: ['Av. Julius Nyerere', 'Av. do Zimbabwe'] },
          { nome: 'Nsalane', avenidas: ['Estrada de Marracuene'] },
        ]
      },
      {
        nome: 'Katembe',
        bairros: [
          { nome: 'Katembe Sede', avenidas: ['Av. Principal de Katembe'] },
          { nome: 'Chamisse', avenidas: [] },
          { nome: 'Guachene', avenidas: [] },
          { nome: 'Inguice', avenidas: [] },
          { nome: 'Mulotana', avenidas: [] },
          { nome: 'Chali', avenidas: [] },
          { nome: 'Incassane', avenidas: [] },
        ]
      }
    ]
  },
  {
    nome: 'Maputo Província',
    cidades: [
      {
        nome: 'Matola',
        bairros: [
          { nome: 'Matola Sede', avenidas: ['Av. das Indústrias', 'EN1'] },
          { nome: 'Machava', avenidas: ['EN1', 'Av. das Indústrias'] },
          { nome: 'Fomento', avenidas: ['EN1', 'Rua do Fomento'] },
          { nome: 'Matola Gare', avenidas: ['EN1'] },
          { nome: 'Km 15', avenidas: ['EN1'] },
          { nome: 'Infulene', avenidas: ['EN1', 'Av. das Indústrias'] },
          { nome: 'Ndlavela', avenidas: ['EN1'] },
          { nome: 'Patrice Lumumba', avenidas: ['EN1', 'Av. Patrice Lumumba'] },
          { nome: 'Matola Rio', avenidas: ['Estrada de Boane'] },
          { nome: 'Muhala', avenidas: ['EN1'] },
          { nome: 'Liberdade', avenidas: ['EN1'] },
          { nome: 'Sikwama', avenidas: [] },
          { nome: 'Tsalala', avenidas: [] },
          { nome: 'Boquisso', avenidas: [] },
          { nome: 'Mali', avenidas: [] },
          { nome: 'T3', avenidas: [] },
          { nome: 'Matola J', avenidas: [] },
        ]
      },
      {
        nome: 'Marracuene',
        bairros: [
          { nome: 'Marracuene Sede', avenidas: ['EN1'] },
          { nome: 'Habel Jafar', avenidas: [] },
          { nome: 'Machubo', avenidas: [] },
          { nome: 'Michafutene', avenidas: [] },
        ]
      },
      {
        nome: 'Boane',
        bairros: [
          { nome: 'Boane Sede', avenidas: ['Estrada de Boane'] },
          { nome: 'Matola Rio', avenidas: [] },
          { nome: 'Campoane', avenidas: [] },
        ]
      },
      {
        nome: 'Namaacha',
        bairros: [
          { nome: 'Namaacha Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Moamba',
        bairros: [
          { nome: 'Moamba Sede', avenidas: [] },
          { nome: 'Sabie', avenidas: [] },
        ]
      },
      {
        nome: 'Manhiça',
        bairros: [
          { nome: 'Manhiça Sede', avenidas: [] },
          { nome: 'Xinavane', avenidas: [] },
          { nome: 'Palmeira', avenidas: [] },
        ]
      },
      {
        nome: 'Magude',
        bairros: [
          { nome: 'Magude Sede', avenidas: [] },
        ]
      },
    ]
  },
  {
    nome: 'Gaza',
    cidades: [
      {
        nome: 'Xai-Xai',
        bairros: [
          { nome: 'Xai-Xai Sede', avenidas: ['Av. Samora Machel', 'Av. Eduardo Mondlane'] },
          { nome: 'Praia de Xai-Xai', avenidas: ['Estrada da Praia'] },
          { nome: 'Patrice Lumumba', avenidas: [] },
          { nome: 'Inhamissa', avenidas: [] },
          { nome: 'Marien Ngouabi', avenidas: [] },
        ]
      },
      {
        nome: 'Chókwè',
        bairros: [
          { nome: 'Chókwè Sede', avenidas: [] },
          { nome: 'Lionde', avenidas: [] },
        ]
      },
      {
        nome: 'Chibuto',
        bairros: [
          { nome: 'Chibuto Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Bilene',
        bairros: [
          { nome: 'Bilene Sede', avenidas: [] },
          { nome: 'Praia de Bilene', avenidas: [] },
        ]
      },
      {
        nome: 'Macia',
        bairros: [
          { nome: 'Macia Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Limpopo',
        bairros: [
          { nome: 'Limpopo Sede', avenidas: [] },
        ]
      },
    ]
  },
  {
    nome: 'Inhambane',
    cidades: [
      {
        nome: 'Inhambane',
        bairros: [
          { nome: 'Inhambane Sede', avenidas: ['Av. da Independência', 'Av. Acordos de Lusaka'] },
          { nome: 'Chambone', avenidas: [] },
          { nome: 'Liberdade', avenidas: [] },
          { nome: 'Balane', avenidas: [] },
        ]
      },
      {
        nome: 'Maxixe',
        bairros: [
          { nome: 'Maxixe Sede', avenidas: [] },
          { nome: 'Chambone', avenidas: [] },
        ]
      },
      {
        nome: 'Vilankulo',
        bairros: [
          { nome: 'Vilankulo Sede', avenidas: [] },
          { nome: 'Chibuene', avenidas: [] },
        ]
      },
      {
        nome: 'Tofo',
        bairros: [
          { nome: 'Praia do Tofo', avenidas: [] },
          { nome: 'Tofinho', avenidas: [] },
        ]
      },
      {
        nome: 'Massinga',
        bairros: [
          { nome: 'Massinga Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Morrumbene',
        bairros: [
          { nome: 'Morrumbene Sede', avenidas: [] },
        ]
      },
    ]
  },
  {
    nome: 'Sofala',
    cidades: [
      {
        nome: 'Beira',
        bairros: [
          { nome: 'Ponta Gêa', avenidas: ['Av. Samora Machel', 'Rua Jaime Ferreira', 'Rua Major Serpa Pinto'] },
          { nome: 'Macúti', avenidas: ['Av. Marginal', 'Rua do Macúti'] },
          { nome: 'Chaimite', avenidas: ['Av. Eduardo Mondlane'] },
          { nome: 'Munhava', avenidas: ['EN6', 'Av. das FPLM'] },
          { nome: 'Manga', avenidas: ['EN6'] },
          { nome: 'Esturro', avenidas: [] },
          { nome: 'Vaz', avenidas: [] },
          { nome: 'Matacuane', avenidas: [] },
          { nome: 'Chipangara', avenidas: [] },
          { nome: 'Nhaconjo', avenidas: [] },
          { nome: 'Pioneiros', avenidas: [] },
          { nome: 'Ndunda', avenidas: [] },
        ]
      },
      {
        nome: 'Dondo',
        bairros: [
          { nome: 'Dondo Sede', avenidas: ['EN1', 'EN6'] },
        ]
      },
      {
        nome: 'Gorongosa',
        bairros: [
          { nome: 'Gorongosa Sede', avenidas: [] },
        ]
      },
    ]
  },
  {
    nome: 'Manica',
    cidades: [
      {
        nome: 'Chimoio',
        bairros: [
          { nome: 'Chimoio Sede (Centro)', avenidas: ['Av. 25 de Setembro', 'Av. Eduardo Mondlane'] },
          { nome: '1º de Maio', avenidas: [] },
          { nome: '7 de Abril', avenidas: [] },
          { nome: 'Nhamaonha', avenidas: [] },
          { nome: 'Chissui', avenidas: [] },
          { nome: 'Heróis Moçambicanos', avenidas: [] },
        ]
      },
      {
        nome: 'Manica',
        bairros: [
          { nome: 'Manica Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Gondola',
        bairros: [
          { nome: 'Gondola Sede', avenidas: ['EN1'] },
          { nome: 'Inchope', avenidas: [] },
        ]
      },
    ]
  },
  {
    nome: 'Tete',
    cidades: [
      {
        nome: 'Tete',
        bairros: [
          { nome: 'Tete Sede (Centro)', avenidas: ['Av. Eduardo Mondlane', 'Av. 25 de Setembro', 'Av. Julius Nyerere'] },
          { nome: 'Chingodzi', avenidas: [] },
          { nome: 'Matundo', avenidas: [] },
          { nome: 'Mpadue', avenidas: [] },
          { nome: 'Filipe Samuel Magaia', avenidas: [] },
          { nome: 'Josina Machel', avenidas: [] },
          { nome: 'Francisco Manyanga', avenidas: [] },
        ]
      },
      {
        nome: 'Moatize',
        bairros: [
          { nome: 'Moatize Sede', avenidas: [] },
          { nome: 'Cateme', avenidas: [] },
        ]
      },
      {
        nome: 'Changara',
        bairros: [
          { nome: 'Changara Sede', avenidas: [] },
        ]
      },
    ]
  },
  {
    nome: 'Zambézia',
    cidades: [
      {
        nome: 'Quelimane',
        bairros: [
          { nome: 'Quelimane Sede (Centro)', avenidas: ['Av. Samora Machel', 'Av. 1 de Julho', 'Av. Eduardo Mondlane', 'Av. Filipe Samuel Magaia'] },
          { nome: 'Chuabo Dembe', avenidas: [] },
          { nome: 'Sangariveira', avenidas: [] },
          { nome: 'Icídua', avenidas: [] },
          { nome: 'Coalane', avenidas: [] },
          { nome: 'Madal', avenidas: [] },
        ]
      },
      {
        nome: 'Mocuba',
        bairros: [
          { nome: 'Mocuba Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Guruè',
        bairros: [
          { nome: 'Guruè Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Milange',
        bairros: [
          { nome: 'Milange Sede', avenidas: [] },
        ]
      },
    ]
  },
  {
    nome: 'Nampula',
    cidades: [
      {
        nome: 'Nampula',
        bairros: [
          { nome: 'Nampula Sede (Centro)', avenidas: ['Av. Eduardo Mondlane', 'Av. do Trabalho', 'Av. Francisco Manyanga', 'Av. 25 de Setembro'] },
          { nome: 'Muhala', avenidas: [] },
          { nome: 'Muatala', avenidas: [] },
          { nome: 'Napipine', avenidas: [] },
          { nome: 'Natikiri', avenidas: [] },
          { nome: 'Namicopo', avenidas: [] },
          { nome: 'Carrupeia', avenidas: [] },
        ]
      },
      {
        nome: 'Nacala',
        bairros: [
          { nome: 'Nacala Porto', avenidas: [] },
          { nome: 'Nacala-a-Velha', avenidas: [] },
        ]
      },
      {
        nome: 'Angoche',
        bairros: [
          { nome: 'Angoche Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Ilha de Moçambique',
        bairros: [
          { nome: 'Cidade de Pedra e Cal', avenidas: [] },
          { nome: 'Cidade de Macuti', avenidas: [] },
        ]
      },
      {
        nome: 'Monapo',
        bairros: [
          { nome: 'Monapo Sede', avenidas: [] },
        ]
      },
    ]
  },
  {
    nome: 'Niassa',
    cidades: [
      {
        nome: 'Lichinga',
        bairros: [
          { nome: 'Lichinga Sede (Centro)', avenidas: ['Av. Samora Machel', 'Av. Eduardo Mondlane', 'Av. Julius Nyerere'] },
          { nome: 'Nomba', avenidas: [] },
          { nome: 'Namacula', avenidas: [] },
          { nome: 'Sanjala', avenidas: [] },
          { nome: 'Chiuaula', avenidas: [] },
        ]
      },
      {
        nome: 'Cuamba',
        bairros: [
          { nome: 'Cuamba Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Marrupa',
        bairros: [
          { nome: 'Marrupa Sede', avenidas: [] },
        ]
      },
    ]
  },
  {
    nome: 'Cabo Delgado',
    cidades: [
      {
        nome: 'Pemba',
        bairros: [
          { nome: 'Pemba Sede (Centro)', avenidas: ['Av. Eduardo Mondlane', 'Av. 25 de Setembro', 'Av. Marginal'] },
          { nome: 'Paquitequete', avenidas: [] },
          { nome: 'Natite', avenidas: [] },
          { nome: 'Cariaco', avenidas: [] },
          { nome: 'Ingonane', avenidas: [] },
          { nome: 'Wimbe', avenidas: ['Av. Marginal'] },
        ]
      },
      {
        nome: 'Montepuez',
        bairros: [
          { nome: 'Montepuez Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Mocímboa da Praia',
        bairros: [
          { nome: 'Mocímboa Sede', avenidas: [] },
        ]
      },
      {
        nome: 'Palma',
        bairros: [
          { nome: 'Palma Sede', avenidas: [] },
        ]
      },
    ]
  },
];

/** Get flat list of all city names for quick access */
export function getAllCities(): string[] {
  const cities: string[] = [];
  for (const prov of MOZAMBIQUE_LOCATIONS) {
    for (const cidade of prov.cidades) {
      cities.push(cidade.nome);
    }
  }
  return cities;
}

/** Get bairros for a given city name */
export function getBairrosForCity(cityName: string): Bairro[] {
  for (const prov of MOZAMBIQUE_LOCATIONS) {
    for (const cidade of prov.cidades) {
      if (cidade.nome === cityName) return cidade.bairros;
    }
  }
  return [];
}

/** Get avenidas for a given city + bairro */
export function getAvenidasForBairro(cityName: string, bairroName: string): string[] {
  const bairros = getBairrosForCity(cityName);
  const bairro = bairros.find(b => b.nome === bairroName);
  return bairro?.avenidas || [];
}

/** Get province for a city */
export function getProvinciaForCity(cityName: string): string {
  for (const prov of MOZAMBIQUE_LOCATIONS) {
    for (const cidade of prov.cidades) {
      if (cidade.nome === cityName) return prov.nome;
    }
  }
  return '';
}
