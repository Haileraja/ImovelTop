/**
 * Property Fields Configuration
 * Central configuration for dynamic form rendering based on property type.
 * Scalable and prepared for international expansion.
 */

export type PropertyCategory = 
  | 'Vivenda' 
  | 'Flat' 
  | 'Loja' 
  | 'Bar' 
  | 'Escritório' 
  | 'Armazém' 
  | 'Terreno' 
  | 'Outro';

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'boolean' 
  | 'textarea' 
  | 'multi-select';

export interface FieldOption {
  value: string;
  labelKey: string; // i18n key
}

export interface FieldConfig {
  name: string;
  labelKey: string; // i18n key
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  suffix?: string; // e.g., "m²", "MZN"
  dependsOn?: { field: string; value: any }; // Conditional display
}

export interface PropertyTypeConfig {
  category: PropertyCategory;
  labelKey: string;
  allowsRent: boolean; // Can be rented (Terreno = false)
  fields: FieldConfig[];
}

// ====== COMMON FIELDS (all property types) ======
export const COMMON_FIELDS: FieldConfig[] = [
  {
    name: 'finalidade',
    labelKey: 'addProperty.purpose',
    type: 'select',
    required: true,
    options: [
      { value: 'venda', labelKey: 'addProperty.sale' },
      { value: 'arrendamento', labelKey: 'addProperty.rent' }
    ]
  },
  {
    name: 'preco',
    labelKey: 'addProperty.price',
    type: 'number',
    required: true,
    placeholder: 'addProperty.pricePlaceholder',
    suffix: 'MZN'
  },
  {
    name: 'negociavel',
    labelKey: 'addProperty.negotiable',
    type: 'select',
    required: true,
    options: [
      { value: 'sim', labelKey: 'general.yes' },
      { value: 'nao', labelKey: 'general.no' }
    ]
  },
  {
    name: 'provincia',
    labelKey: 'addProperty.province',
    type: 'select',
    required: true
  },
  {
    name: 'cidade',
    labelKey: 'addProperty.city',
    type: 'select',
    required: true
  },
  {
    name: 'bairro',
    labelKey: 'addProperty.bairro',
    type: 'select',
    required: true
  },
  {
    name: 'latitude',
    labelKey: 'addProperty.latitude',
    type: 'number',
    required: false,
    placeholder: 'addProperty.latitudePlaceholder'
  },
  {
    name: 'longitude',
    labelKey: 'addProperty.longitude',
    type: 'number',
    required: false,
    placeholder: 'addProperty.longitudePlaceholder'
  },
  {
    name: 'areaTotal',
    labelKey: 'addProperty.totalArea',
    type: 'number',
    required: false,
    placeholder: 'addProperty.areaPlaceholder',
    suffix: 'm²'
  },
  {
    name: 'descricao',
    labelKey: 'addProperty.description',
    type: 'textarea',
    required: true,
    placeholder: 'addProperty.descriptionPlaceholder'
  },
  {
    name: 'tipoAnunciante',
    labelKey: 'addProperty.advertiserType',
    type: 'select',
    required: true,
    options: [
      { value: 'particular', labelKey: 'addProperty.private' },
      { value: 'agente', labelKey: 'addProperty.agent' },
      { value: 'empresa', labelKey: 'addProperty.company' }
    ]
  },
  {
    name: 'disponibilidade',
    labelKey: 'addProperty.availability',
    type: 'select',
    required: true,
    options: [
      { value: 'meio_semana', labelKey: 'addProperty.weekdays' },
      { value: 'fim_semana', labelKey: 'addProperty.weekends' },
      { value: 'meio_dia', labelKey: 'addProperty.midday' },
      { value: 'todo_dia', labelKey: 'addProperty.allDay' },
      { value: 'dias_especificos', labelKey: 'addProperty.specificDays' }
    ]
  },
  {
    name: 'diasEspecificos',
    labelKey: 'addProperty.specificDaysDetail',
    type: 'text',
    required: false,
    placeholder: 'addProperty.specificDaysPlaceholder',
    dependsOn: { field: 'disponibilidade', value: 'dias_especificos' }
  }
];

// ====== VIVENDA SPECIFIC FIELDS ======
const VIVENDA_FIELDS: FieldConfig[] = [
  { name: 'quartos', labelKey: 'addProperty.bedrooms', type: 'number', required: true, min: 0 },
  { name: 'suites', labelKey: 'addProperty.suites', type: 'number', required: false, min: 0 },
  { name: 'casasBanho', labelKey: 'addProperty.bathrooms', type: 'number', required: true, min: 0 },
  { name: 'salas', labelKey: 'addProperty.livingRooms', type: 'number', required: false, min: 0 },
  { name: 'areaConstruida', labelKey: 'addProperty.builtArea', type: 'number', required: false, suffix: 'm²' },
  { name: 'pisos', labelKey: 'addProperty.floors', type: 'number', required: false, min: 1 },
  { name: 'capacidadeGaragem', labelKey: 'addProperty.garageCapacity', type: 'number', required: false, min: 0 },
  { name: 'quintal', labelKey: 'addProperty.backyard', type: 'boolean', required: false },
  { name: 'piscina', labelKey: 'addProperty.pool', type: 'boolean', required: false },
  { name: 'jardim', labelKey: 'addProperty.garden', type: 'boolean', required: false },
  { name: 'sistemaSeguranca', labelKey: 'addProperty.securitySystem', type: 'boolean', required: false },
  { name: 'anoConstrucao', labelKey: 'addProperty.yearBuilt', type: 'number', required: false, min: 1900, max: new Date().getFullYear() },
  { 
    name: 'estadoImovel', 
    labelKey: 'addProperty.propertyCondition', 
    type: 'select', 
    required: true,
    options: [
      { value: 'novo', labelKey: 'addProperty.new' },
      { value: 'usado', labelKey: 'addProperty.used' },
      { value: 'renovado', labelKey: 'addProperty.renovated' }
    ]
  },
  { name: 'mobilada', labelKey: 'addProperty.furnished', type: 'boolean', required: false },
  { name: 'outros', labelKey: 'addProperty.others', type: 'textarea', required: false, placeholder: 'addProperty.othersPlaceholder' }
];

// ====== FLAT SPECIFIC FIELDS ======
const FLAT_FIELDS: FieldConfig[] = [
  { name: 'quartos', labelKey: 'addProperty.bedrooms', type: 'number', required: true, min: 0 },
  { name: 'casasBanho', labelKey: 'addProperty.bathrooms', type: 'number', required: true, min: 0 },
  { name: 'andar', labelKey: 'addProperty.floor', type: 'number', required: false, min: 0 },
  { name: 'elevador', labelKey: 'addProperty.elevator', type: 'boolean', required: false },
  { name: 'varanda', labelKey: 'addProperty.balcony', type: 'boolean', required: false },
  { name: 'valorCondominio', labelKey: 'addProperty.condoFee', type: 'number', required: false, suffix: 'MZN' },
  { name: 'estacionamento', labelKey: 'addProperty.parking', type: 'boolean', required: false },
  { name: 'seguranca24h', labelKey: 'addProperty.security24h', type: 'boolean', required: false },
  { name: 'mobilada', labelKey: 'addProperty.furnished', type: 'boolean', required: false },
  { name: 'vista', labelKey: 'addProperty.view', type: 'text', required: false, placeholder: 'addProperty.viewPlaceholder' },
  { name: 'areaUtil', labelKey: 'addProperty.usableArea', type: 'number', required: false, suffix: 'm²' },
  { name: 'outros', labelKey: 'addProperty.others', type: 'textarea', required: false, placeholder: 'addProperty.othersPlaceholder' }
];

// ====== LOJA SPECIFIC FIELDS ======
const LOJA_FIELDS: FieldConfig[] = [
  { name: 'areaUtil', labelKey: 'addProperty.usableArea', type: 'number', required: true, suffix: 'm²' },
  { 
    name: 'tipoLocalizacaoComercial', 
    labelKey: 'addProperty.commercialLocation', 
    type: 'select', 
    required: true,
    options: [
      { value: 'shopping', labelKey: 'addProperty.shopping' },
      { value: 'rua_principal', labelKey: 'addProperty.mainStreet' },
      { value: 'bairro', labelKey: 'addProperty.neighborhood' }
    ]
  },
  { name: 'frenteRua', labelKey: 'addProperty.streetFront', type: 'boolean', required: false },
  { name: 'divisoes', labelKey: 'addProperty.divisions', type: 'number', required: false, min: 0 },
  { name: 'casaBanho', labelKey: 'addProperty.hasBathroom', type: 'boolean', required: false },
  { name: 'estacionamento', labelKey: 'addProperty.parking', type: 'boolean', required: false },
  { name: 'licencaComercial', labelKey: 'addProperty.commercialLicense', type: 'boolean', required: false },
  { name: 'seguranca24h', labelKey: 'addProperty.security24h', type: 'boolean', required: false },
  { name: 'outros', labelKey: 'addProperty.others', type: 'textarea', required: false, placeholder: 'addProperty.othersPlaceholder' }
];

// ====== BAR SPECIFIC FIELDS ======
const BAR_FIELDS: FieldConfig[] = [
  { name: 'capacidadePessoas', labelKey: 'addProperty.peopleCapacity', type: 'number', required: true, min: 0 },
  { name: 'cozinhaEquipada', labelKey: 'addProperty.equippedKitchen', type: 'boolean', required: false },
  { name: 'licencaAtiva', labelKey: 'addProperty.activeLicense', type: 'boolean', required: false },
  { name: 'mobiliarioIncluido', labelKey: 'addProperty.furnitureIncluded', type: 'boolean', required: false },
  { name: 'sistemaSom', labelKey: 'addProperty.soundSystem', type: 'boolean', required: false },
  { name: 'areaInterior', labelKey: 'addProperty.interiorArea', type: 'number', required: false, suffix: 'm²' },
  { name: 'areaExterior', labelKey: 'addProperty.exteriorArea', type: 'number', required: false, suffix: 'm²' },
  { name: 'historicoFaturacao', labelKey: 'addProperty.billingHistory', type: 'textarea', required: false, placeholder: 'addProperty.billingHistoryPlaceholder' },
  { name: 'seguranca24h', labelKey: 'addProperty.security24h', type: 'boolean', required: false },
  { name: 'outros', labelKey: 'addProperty.others', type: 'textarea', required: false, placeholder: 'addProperty.othersPlaceholder' }
];

// ====== ESCRITÓRIO SPECIFIC FIELDS ======
const ESCRITORIO_FIELDS: FieldConfig[] = [
  { name: 'areaUtil', labelKey: 'addProperty.usableArea', type: 'number', required: true, suffix: 'm²' },
  { 
    name: 'tipoEspaco', 
    labelKey: 'addProperty.spaceType', 
    type: 'select', 
    required: true,
    options: [
      { value: 'open_space', labelKey: 'addProperty.openSpace' },
      { value: 'dividido', labelKey: 'addProperty.divided' }
    ]
  },
  { name: 'gabinetes', labelKey: 'addProperty.offices', type: 'number', required: false, min: 0 },
  { name: 'salaReuniao', labelKey: 'addProperty.meetingRoom', type: 'boolean', required: false },
  { name: 'casasBanho', labelKey: 'addProperty.bathrooms', type: 'number', required: false, min: 0 },
  { name: 'elevador', labelKey: 'addProperty.elevator', type: 'boolean', required: false },
  { name: 'estacionamento', labelKey: 'addProperty.parking', type: 'boolean', required: false },
  { name: 'internetInstalada', labelKey: 'addProperty.internetInstalled', type: 'boolean', required: false },
  { name: 'seguranca', labelKey: 'addProperty.security', type: 'boolean', required: false },
  { name: 'outros', labelKey: 'addProperty.others', type: 'textarea', required: false, placeholder: 'addProperty.othersPlaceholder' }
];

// ====== ARMAZÉM SPECIFIC FIELDS ======
const ARMAZEM_FIELDS: FieldConfig[] = [
  { name: 'areaTotal', labelKey: 'addProperty.totalArea', type: 'number', required: false, suffix: 'm²' },
  { name: 'alturaPeDireito', labelKey: 'addProperty.ceilingHeight', type: 'number', required: false, suffix: 'm' },
  { name: 'acessoCamioes', labelKey: 'addProperty.truckAccess', type: 'boolean', required: false },
  { name: 'portaCargaDescarga', labelKey: 'addProperty.loadingDock', type: 'boolean', required: false },
  { name: 'pisoIndustrial', labelKey: 'addProperty.industrialFloor', type: 'boolean', required: false },
  { name: 'energiaTrifasica', labelKey: 'addProperty.threePhaseEnergy', type: 'boolean', required: false },
  { name: 'escritorioInterno', labelKey: 'addProperty.internalOffice', type: 'boolean', required: false },
  { name: 'proximidadeEstrada', labelKey: 'addProperty.nearMainRoad', type: 'boolean', required: false },
  { name: 'outros', labelKey: 'addProperty.others', type: 'textarea', required: false, placeholder: 'addProperty.othersPlaceholder' }
];

// ====== TERRENO SPECIFIC FIELDS ======
const TERRENO_FIELDS: FieldConfig[] = [
  { name: 'areaTotal', labelKey: 'addProperty.totalArea', type: 'number', required: false, suffix: 'm²' },
  { 
    name: 'tipoTerreno', 
    labelKey: 'addProperty.landType', 
    type: 'select', 
    required: true,
    options: [
      { value: 'urbano', labelKey: 'addProperty.urban' },
      { value: 'rural', labelKey: 'addProperty.rural' },
      { value: 'industrial', labelKey: 'addProperty.industrial' },
      { value: 'agricola', labelKey: 'addProperty.agricultural' }
    ]
  },
  { name: 'planoConstrucaoAprovado', labelKey: 'addProperty.approvedBuildingPlan', type: 'boolean', required: false },
  { name: 'documentacaoRegularizada', labelKey: 'addProperty.regularizedDocumentation', type: 'boolean', required: false },
  { name: 'acessoAsfaltado', labelKey: 'addProperty.pavedAccess', type: 'boolean', required: false },
  { 
    name: 'infraestruturas', 
    labelKey: 'addProperty.infrastructures', 
    type: 'multi-select', 
    required: false,
    options: [
      { value: 'agua', labelKey: 'addProperty.water' },
      { value: 'energia', labelKey: 'addProperty.energy' },
      { value: 'esgoto', labelKey: 'addProperty.sewage' }
    ]
  },
  { 
    name: 'topografia', 
    labelKey: 'addProperty.topography', 
    type: 'select', 
    required: false,
    options: [
      { value: 'plano', labelKey: 'addProperty.flat' },
      { value: 'inclinado', labelKey: 'addProperty.sloped' }
    ]
  },
  { name: 'planoPagamento', labelKey: 'addProperty.paymentPlan', type: 'textarea', required: false, placeholder: 'addProperty.paymentPlanPlaceholder' },
  { name: 'murado', labelKey: 'addProperty.walled', type: 'boolean', required: false },
  { name: 'outros', labelKey: 'addProperty.others', type: 'textarea', required: false, placeholder: 'addProperty.othersPlaceholder' }
];

// ====== OUTRO SPECIFIC FIELDS ======
const OUTRO_FIELDS: FieldConfig[] = [
  { name: 'outroTipoDescricao', labelKey: 'addProperty.otherTypeDescription', type: 'textarea', required: true, placeholder: 'addProperty.describeOtherType' }
];

// ====== PROPERTY TYPE CONFIGURATIONS ======
export const PROPERTY_TYPES_CONFIG: PropertyTypeConfig[] = [
  { category: 'Vivenda', labelKey: 'addProperty.categoryVivenda', allowsRent: true, fields: VIVENDA_FIELDS },
  { category: 'Flat', labelKey: 'addProperty.categoryFlat', allowsRent: true, fields: FLAT_FIELDS },
  { category: 'Loja', labelKey: 'addProperty.categoryLoja', allowsRent: true, fields: LOJA_FIELDS },
  { category: 'Bar', labelKey: 'addProperty.categoryBar', allowsRent: true, fields: BAR_FIELDS },
  { category: 'Escritório', labelKey: 'addProperty.categoryEscritorio', allowsRent: true, fields: ESCRITORIO_FIELDS },
  { category: 'Armazém', labelKey: 'addProperty.categoryArmazem', allowsRent: true, fields: ARMAZEM_FIELDS },
  { category: 'Terreno', labelKey: 'addProperty.categoryTerreno', allowsRent: false, fields: TERRENO_FIELDS },
  { category: 'Outro', labelKey: 'addProperty.categoryOutro', allowsRent: true, fields: OUTRO_FIELDS }
];

// Helper to get config for a specific property type
export function getPropertyTypeConfig(category: PropertyCategory): PropertyTypeConfig | undefined {
  return PROPERTY_TYPES_CONFIG.find(c => c.category === category);
}

// Helper to get all fields for a property type (common + specific)
export function getAllFieldsForType(category: PropertyCategory): FieldConfig[] {
  const typeConfig = getPropertyTypeConfig(category);
  if (!typeConfig) return [...COMMON_FIELDS];
  
  // For Terreno, filter out arrendamento option from finalidade
  const commonFields = category === 'Terreno' 
    ? COMMON_FIELDS.map(f => {
        if (f.name === 'finalidade') {
          return {
            ...f,
            options: f.options?.filter(o => o.value !== 'arrendamento')
          };
        }
        return f;
      })
    : COMMON_FIELDS;
  
  return [...commonFields, ...typeConfig.fields];
}

// Helper to validate required fields for a property type
export function validateRequiredFields(category: PropertyCategory, data: Record<string, any>): { valid: boolean; missingFields: string[] } {
  const fields = getAllFieldsForType(category);
  const missingFields: string[] = [];
  
  for (const field of fields) {
    if (field.required) {
      // Check dependsOn condition
      if (field.dependsOn) {
        const dependentValue = data[field.dependsOn.field];
        if (dependentValue !== field.dependsOn.value) {
          continue; // Skip validation if dependent condition not met
        }
      }
      
      const value = data[field.name];
      if (value === undefined || value === null || value === '') {
        missingFields.push(field.name);
      }
    }
  }
  
  return { valid: missingFields.length === 0, missingFields };
}

// Calculate price per square meter
export function calculatePricePerM2(price: number, area: number): number | null {
  if (!price || !area || area <= 0) return null;
  return Math.round(price / area);
}
