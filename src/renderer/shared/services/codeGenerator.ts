// Code Generator Service
// Main service for generating JavaScript code from action metadata

import { Action, BasicAuthentication } from '../types/actions';
import { actionsToCode } from '../utils/codeGeneration/actionsToCode';

export class CodeGenerator {
  /**
   * Generate JavaScript test code from actions and basic auth
   * @param basicAuth Basic authentication configuration (optional)
   * @param actions Array of actions to generate code for
   * @returns Generated JavaScript code as string
   */
  generateCode(basicAuth: BasicAuthentication | null | undefined, actions: Action[]): string {
    if (!actions || actions.length === 0) {
      return '';
    }
    
    return actionsToCode(basicAuth, actions);
  }
}
