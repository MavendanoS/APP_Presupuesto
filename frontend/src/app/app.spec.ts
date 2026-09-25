import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SwUpdate } from '@angular/service-worker';
import { EMPTY } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { App } from './app';
import { AuthService } from './core/services/auth.service';
import { InactivityService } from './core/services/inactivity.service';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ReAuthModalComponent } from './shared/components/re-auth-modal/re-auth-modal.component';
import { environment } from '../environments/environment';

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.removeItem('lastActivityTime');

    await TestBed.configureTestingModule({
      imports: [
        App,
        TranslocoTestingModule.forRoot({
          langs: { es: {}, en: {} },
          translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' }
        })
      ],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: false,
            versionUpdates: EMPTY,
            unrecoverable: EMPTY,
            checkForUpdate: () => Promise.resolve(false),
            activateUpdate: () => Promise.resolve(true)
          }
        }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  function flushInitialRequests(meStatus: 200 | 401): void {
    const me = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
    if (meStatus === 200) {
      me.flush({
        success: true,
        data: {
          user: { id: 1, email: 'test@example.com', name: 'Test', language: 'es', currency: 'CLP', created_at: '' }
        }
      });
    } else {
      me.flush({ error: 'Unauthorized', message: 'No autenticado' }, { status: 401, statusText: 'Unauthorized' });
    }
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
    flushInitialRequests(401);
  });

  it('should render the router outlet and the re-auth modal', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('app-re-auth-modal')).toBeTruthy();
    flushInitialRequests(401);
  });

  it('should mark auth as checked (unauthenticated) when /auth/me returns 401, without logging out', () => {
    const auth = TestBed.inject(AuthService);
    const logoutSpy = spyOn(auth, 'logout').and.callThrough();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    flushInitialRequests(401);

    expect(auth.authChecked()).toBeTrue();
    expect(auth.isAuthenticated()).toBeFalse();
    expect(logoutSpy).not.toHaveBeenCalled();
    httpMock.expectNone(`${environment.apiUrl}/auth/logout`);
  });

  it('should open the re-auth modal when inactivity is detected', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    flushInitialRequests(200);
    fixture.detectChanges();

    TestBed.inject(InactivityService).inactivityDetected$.next();
    fixture.detectChanges();

    const modal = fixture.debugElement.query(
      (de) => de.componentInstance instanceof ReAuthModalComponent
    ).componentInstance as ReAuthModalComponent;
    expect(modal.show()).toBeTrue();
  });

  afterEach(() => {
    httpMock.match(() => true);
    TestBed.inject(InactivityService).stopMonitoring();
  });
});
