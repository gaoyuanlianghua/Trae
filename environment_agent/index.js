const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnvironmentAgent {
  constructor() {
    this.dependencies = {};
    this.environmentInfo = {};
    this.configurations = {};
    this.packageManagers = {
      npm: this.checkNpm.bind(this),
      pip: this.checkPip.bind(this),
      yarn: this.checkYarn.bind(this),
      pnpm: this.checkPnpm.bind(this)
    };
    
    // 初始化环境信息
    this.detectEnvironment();
  }

  // 环境检测功能
  detectEnvironment() {
    console.log('开始环境检测...');
    
    // 检测操作系统
    this.environmentInfo.os = process.platform;
    this.environmentInfo.arch = process.arch;
    this.environmentInfo.nodeVersion = process.version;
    
    // 检测包管理器
    this.environmentInfo.packageManagers = {};
    Object.keys(this.packageManagers).forEach(manager => {
      this.environmentInfo.packageManagers[manager] = this.packageManagers[manager]();
    });
    
    // 检测项目依赖
    this.detectDependencies();
    
    // 检测版本控制
    this.environmentInfo.versionControl = this.detectVersionControl();
    
    console.log('环境检测完成:', this.environmentInfo);
    return this.environmentInfo;
  }

  // 检测npm
  checkNpm() {
    try {
      const version = execSync('npm --version', { encoding: 'utf8' }).trim();
      return version;
    } catch (error) {
      return null;
    }
  }

  // 检测pip
  checkPip() {
    try {
      const version = execSync('pip --version', { encoding: 'utf8' }).trim();
      return version;
    } catch (error) {
      return null;
    }
  }

  // 检测yarn
  checkYarn() {
    try {
      const version = execSync('yarn --version', { encoding: 'utf8' }).trim();
      return version;
    } catch (error) {
      return null;
    }
  }

  // 检测pnpm
  checkPnpm() {
    try {
      const version = execSync('pnpm --version', { encoding: 'utf8' }).trim();
      return version;
    } catch (error) {
      return null;
    }
  }

  // 检测项目依赖
  detectDependencies() {
    // 检测package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        this.dependencies.npm = {
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {}
        };
      } catch (error) {
        console.error('读取package.json失败:', error.message);
      }
    }
    
    // 检测requirements.txt
    const requirementsPath = path.join(process.cwd(), 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      try {
        const requirements = fs.readFileSync(requirementsPath, 'utf8').split('\n')
          .filter(line => line.trim() && !line.trim().startsWith('#'));
        this.dependencies.python = requirements;
      } catch (error) {
        console.error('读取requirements.txt失败:', error.message);
      }
    }
  }

  // 检测版本控制
  detectVersionControl() {
    try {
      // 检测git
      execSync('git --version', { encoding: 'utf8' });
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      return {
        type: 'git',
        branch,
        commit
      };
    } catch (error) {
      return null;
    }
  }

  // 包管理器功能
  installDependency(packageName, options = {}) {
    const { manager = 'npm', version = '', save = true } = options;
    
    let command = '';
    switch (manager) {
      case 'npm':
        command = `npm install ${packageName}${version ? '@' + version : ''} ${save ? '--save' : '--save-dev'}`;
        break;
      case 'pip':
        command = `pip install ${packageName}${version ? '==' + version : ''}`;
        break;
      case 'yarn':
        command = `yarn add ${packageName}${version ? '@' + version : ''} ${save ? '' : '--dev'}`;
        break;
      case 'pnpm':
        command = `pnpm add ${packageName}${version ? '@' + version : ''} ${save ? '' : '--save-dev'}`;
        break;
      default:
        console.error('不支持的包管理器:', manager);
        return false;
    }
    
    console.log(`安装依赖: ${command}`);
    try {
      const result = execSync(command, { encoding: 'utf8' });
      console.log('依赖安装成功:', result);
      // 重新检测依赖
      this.detectDependencies();
      return true;
    } catch (error) {
      console.error('依赖安装失败:', error.message);
      return false;
    }
  }

  // 卸载依赖
  uninstallDependency(packageName, options = {}) {
    const { manager = 'npm' } = options;
    
    let command = '';
    switch (manager) {
      case 'npm':
        command = `npm uninstall ${packageName}`;
        break;
      case 'pip':
        command = `pip uninstall -y ${packageName}`;
        break;
      case 'yarn':
        command = `yarn remove ${packageName}`;
        break;
      case 'pnpm':
        command = `pnpm remove ${packageName}`;
        break;
      default:
        console.error('不支持的包管理器:', manager);
        return false;
    }
    
    console.log(`卸载依赖: ${command}`);
    try {
      const result = execSync(command, { encoding: 'utf8' });
      console.log('依赖卸载成功:', result);
      // 重新检测依赖
      this.detectDependencies();
      return true;
    } catch (error) {
      console.error('依赖卸载失败:', error.message);
      return false;
    }
  }

  // 更新依赖
  updateDependency(packageName, options = {}) {
    const { manager = 'npm' } = options;
    
    let command = '';
    switch (manager) {
      case 'npm':
        command = `npm update ${packageName}`;
        break;
      case 'pip':
        command = `pip install --upgrade ${packageName}`;
        break;
      case 'yarn':
        command = `yarn upgrade ${packageName}`;
        break;
      case 'pnpm':
        command = `pnpm update ${packageName}`;
        break;
      default:
        console.error('不支持的包管理器:', manager);
        return false;
    }
    
    console.log(`更新依赖: ${command}`);
    try {
      const result = execSync(command, { encoding: 'utf8' });
      console.log('依赖更新成功:', result);
      // 重新检测依赖
      this.detectDependencies();
      return true;
    } catch (error) {
      console.error('依赖更新失败:', error.message);
      return false;
    }
  }

  // 配置管理功能
  loadConfiguration(configPath) {
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.configurations[configPath] = config;
        console.log(`加载配置: ${configPath}`);
        return config;
      } else {
        console.error('配置文件不存在:', configPath);
        return null;
      }
    } catch (error) {
      console.error('加载配置失败:', error.message);
      return null;
    }
  }

  // 保存配置
  saveConfiguration(configPath, config) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      this.configurations[configPath] = config;
      console.log(`保存配置: ${configPath}`);
      return true;
    } catch (error) {
      console.error('保存配置失败:', error.message);
      return false;
    }
  }

  // 获取环境信息
  getEnvironmentInfo() {
    return this.environmentInfo;
  }

  // 获取依赖信息
  getDependencies() {
    return this.dependencies;
  }

  // 获取配置信息
  getConfiguration(configPath) {
    return this.configurations[configPath] || null;
  }

  // 检查环境健康状态
  checkEnvironmentHealth() {
    const health = {
      os: this.environmentInfo.os,
      nodeVersion: this.environmentInfo.nodeVersion,
      packageManagers: this.environmentInfo.packageManagers,
      versionControl: this.environmentInfo.versionControl,
      dependencies: this.dependencies,
      status: 'healthy'
    };
    
    // 检查关键依赖
    if (this.dependencies.npm && Object.keys(this.dependencies.npm.dependencies).length === 0) {
      health.status = 'warning';
      health.message = '项目依赖为空';
    }
    
    console.log('环境健康检查:', health);
    return health;
  }
}

module.exports = EnvironmentAgent;