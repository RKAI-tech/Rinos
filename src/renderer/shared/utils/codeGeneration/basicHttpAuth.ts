// Basic HTTP auth code generation
// Ported from downloads/basic_http_auth.txt

import { BasicAuthentication } from '../../types/actions';

export function getBasicHttpAuthCode(basicAuth: BasicAuthentication | null | undefined): string {
  if (!basicAuth) {
    return '';
  }
  
  return `test.use({
    httpCredentials: {
        username: '${basicAuth.username}',
        password: '${basicAuth.password}',
    },
});
`;
}
