import { load, dump } from 'js-yaml';
import * as fs from 'node:fs';

export interface Module {
  name: string;
  path: string;
  remote: string;
  branch: string;
  auto_sync?: boolean;
}

export interface Settings {
  default_branch?: string;
  show_all_modules_in_status?: boolean;
  auto_ignore_git?: boolean;
}

export interface Config {
  version: string;
  modules: Record<string, Module>;
  settings?: Settings;
}

export class ConfigManager {
  static create(): Config {
    return {
      version: '1.0',
      modules: {},
      settings: { default_branch: 'main', show_all_modules_in_status: true, auto_ignore_git: true },
    };
  }

  static load(path: string): Config {
    const content = fs.readFileSync(path, 'utf-8');
    return load(content) as Config;
  }

  save(path: string, config: Config): void {
    fs.writeFileSync(path, dump(config, { skipInvalid: true }), 'utf-8');
  }

  findModule(config: Config, nameOrPath: string): Module | undefined {
    if (config.modules[nameOrPath]) return config.modules[nameOrPath];
    for (const m of Object.values(config.modules)) {
      if (m.path === nameOrPath) return m;
    }
    return undefined;
  }

  addModule(config: Config, module: Module): void {
    config.modules[module.name] = module;
  }

  updateModule(config: Config, name: string, module: Module): boolean {
    if (!config.modules[name]) return false;
    config.modules[name] = module;
    return true;
  }
}
