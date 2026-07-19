import { AppError } from '../errors/index.js';
import { ERROR_CODE } from '../errors/index.js';
import { CONFIG_SCHEMA } from './schema.js';

export function validateConfiguration(configuration) {
  if (!configuration) {
    throw new AppError({
      message: 'Configuration is required.',
      code: ERROR_CODE.CONFIGURATION,
    });
  }

  // Menggunakan Structured Clone modern Cloudflare Workers untuk kloning mendalam objek konfigurasi
  const clonedConfig = structuredClone(configuration);

  validateSection(clonedConfig, CONFIG_SCHEMA, []);

  return Object.freeze(clonedConfig);
}

function validateSection(configNode, schemaNode, path) {
  for (const key of Object.keys(schemaNode)) {
    const schemaItem = schemaNode[key];
    const currentPath = [...path, key];
    const configValue = configNode[key];

    // Jika node skema merupakan struktur bersarang, validasi secara rekursif
    if (
      schemaItem &&
      typeof schemaItem === 'object' &&
      !Object.prototype.hasOwnProperty.call(schemaItem, 'required') &&
      !Object.prototype.hasOwnProperty.call(schemaItem, 'defaultValue')
    ) {
      if (configValue === undefined || configValue === null) {
        configNode[key] = {};
      }
      validateSection(configNode[key] || {}, schemaItem, currentPath);
      continue;
    }

    // Suntikkan nilai default jika parameter kosong
    if (
      Object.prototype.hasOwnProperty.call(schemaItem, 'defaultValue') &&
      (configValue === undefined || configValue === null)
    ) {
      configNode[key] = schemaItem.defaultValue;
    }

    const finalValue = configNode[key];

    // Verifikasi parameter wajib
    if (schemaItem.required && (finalValue === undefined || finalValue === null)) {
      throw new AppError({
        message: `Configuration parameter "${currentPath.join('.')}" is required but missing.`,
        code: ERROR_CODE.CONFIGURATION,
      });
    }

    // Verifikasi tipe data konfigurasi (Type Safety)
    if (finalValue !== undefined && finalValue !== null && schemaItem.type) {
      const actualType = typeof finalValue;
      if (schemaItem.type === 'array') {
        if (!Array.isArray(finalValue)) {
          throw new AppError({
            message: `Configuration parameter "${currentPath.join('.')}" should be of type "array", but got "${actualType}".`,
            code: ERROR_CODE.CONFIGURATION,
          });
        }
      } else if (schemaItem.type === 'boolean') {
        if (actualType !== 'boolean') {
          throw new AppError({
            message: `Configuration parameter "${currentPath.join('.')}" should be of type "boolean", but got "${actualType}".`,
            code: ERROR_CODE.CONFIGURATION,
          });
        }
      } else if (schemaItem.type === 'number') {
        if (actualType !== 'number' || isNaN(finalValue)) {
          throw new AppError({
            message: `Configuration parameter "${currentPath.join('.')}" should be of type "number", but got "${actualType}".`,
            code: ERROR_CODE.CONFIGURATION,
          });
        }
      } else if (schemaItem.type === 'string') {
        if (actualType !== 'string') {
          throw new AppError({
            message: `Configuration parameter "${currentPath.join('.')}" should be of type "string", but got "${actualType}".`,
            code: ERROR_CODE.CONFIGURATION,
          });
        }
      }
    }
  }
}
