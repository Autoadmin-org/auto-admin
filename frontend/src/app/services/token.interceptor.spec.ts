import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';

import { TokenInterceptor } from './token.interceptor';
import { ConfigurationService } from './configuration.service';

describe('TokenInterceptor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [
      HttpClientTestingModule,
      RouterTestingModule.withRoutes([]),
      MatSnackBarModule,
      MatDialogModule
    ],
    providers: [
      TokenInterceptor,
      {
        provide: ConfigurationService,
        useValue: { CONFIG_URL: 'https://api-v2.autoadmin.org' }
      }
    ]
  }));

  it('should be created', () => {
    const interceptor: TokenInterceptor = TestBed.inject(TokenInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
