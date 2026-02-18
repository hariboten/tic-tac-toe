import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should show initial player status', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.status')?.textContent).toContain('現在の手番: X');
  });

  it('should render a 3x3 board', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.cell').length).toBe(9);
  });

  it('should switch player agent to monte carlo by clicking toggle button', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const monteCarloButton = compiled.querySelectorAll('.agent-row')[1]?.querySelectorAll('.agent-toggle')[2] as HTMLButtonElement;

    monteCarloButton.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.mode')?.textContent).toContain('O: モンテカルロ');
  });

  it('should switch player agent to minimax by clicking toggle button', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const minimaxButton = compiled.querySelectorAll('.agent-row')[1]?.querySelectorAll('.agent-toggle')[3] as HTMLButtonElement;

    minimaxButton.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.mode')?.textContent).toContain('O: ミニマックス');
  });

  it('should train q-learning from agent tab', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tabs = compiled.querySelectorAll('.tab-button');

    (tabs[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    app.trainingConfig.episodes = 100;

    const trainButton = compiled.querySelector('.train') as HTMLButtonElement;
    trainButton.click();
    tick(1000);
    fixture.detectChanges();

    expect(compiled.querySelector('.training-message')?.textContent).toContain('エピソードを学習しました');
  }));


  it('should keep overlay hidden when overlay assistant is off', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.overlay-rate').length).toBe(0);
  });

  it('should show monte carlo overlay when overlay assistant is enabled', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;

    app.setMonteCarloOverlayAssistant('MONTE_CARLO');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.overlay-rate').length).toBeGreaterThan(0);
    expect(compiled.querySelector('.overlay-status')?.textContent).toContain('現在局面評価');

    randomSpy.mockRestore();
  });

  it('should keep monte carlo overlay visible after switching turn', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;

    app.setMonteCarloOverlayAssistant('MONTE_CARLO');
    app.play(0);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(app.currentPlayer).toBe('O');
    expect(compiled.querySelectorAll('.overlay-rate').length).toBeGreaterThan(0);
    expect(compiled.querySelector('.overlay-status')?.textContent).toContain('O 視点');

    randomSpy.mockRestore();
  });

  it('should auto play when random agent turn starts after a short delay', fakeAsync(() => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    app.setAgent('O', 'RANDOM');
    app.play(0);

    expect(app.board.filter((cell: string | null) => cell !== null).length).toBe(1);

    tick(550);

    expect(app.board.filter((cell: string | null) => cell !== null).length).toBe(2);

    randomSpy.mockRestore();
  }));
});
