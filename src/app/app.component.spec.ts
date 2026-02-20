import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
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


  it('should show app version in footer', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-version')?.textContent).toContain('Version');
    expect(compiled.querySelector('.app-version')?.textContent).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should render a 3x3 board', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.cell').length).toBe(9);
  });

  it('should switch player agent to monte carlo by selecting from dropdown', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const agentOSelect = compiled.querySelector('#agent-o-select') as HTMLSelectElement;

    agentOSelect.value = 'MONTE_CARLO';
    agentOSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(compiled.querySelector('.mode')?.textContent).toContain('O: モンテカルロ');
  });

  it('should switch player agent to minimax by selecting from dropdown', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const agentOSelect = compiled.querySelector('#agent-o-select') as HTMLSelectElement;

    agentOSelect.value = 'MINIMAX';
    agentOSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(compiled.querySelector('.mode')?.textContent).toContain('O: ミニマックス');
  });

  it('should show training workspace by default in agent tab', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tabs = compiled.querySelectorAll('.tabs .tab-button');
    (tabs[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(compiled.querySelector('[aria-label="agent training workspace"]')).toBeTruthy();
    expect(compiled.querySelector('[aria-label="agent data workspace"]')).toBeFalsy();
  });

  it('should train q-learning from agent tab', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tabs = compiled.querySelectorAll('.tabs .tab-button');

    (tabs[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    app.trainingConfig.episodes = 100;

    const trainButton = compiled.querySelector('.train') as HTMLButtonElement;
    trainButton.click();
    tick(1000);
    fixture.detectChanges();

    expect(compiled.querySelector('.training-message')?.textContent).toContain('エピソードを学習しました');
  }));

  it('should export and import q-learning data from data workspace', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tabs = compiled.querySelectorAll('.tabs .tab-button');
    (tabs[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    app.trainingConfig.episodes = 20;
    (compiled.querySelector('.train') as HTMLButtonElement).click();
    tick(1000);
    fixture.detectChanges();

    const workspaceTabs = compiled.querySelectorAll('.agent-workspace-tabs .tab-button');
    (workspaceTabs[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    const exportButton = Array.from(compiled.querySelectorAll('.training-actions button')).find((button) =>
      button.textContent?.includes('JSONエクスポート')
    ) as HTMLButtonElement;
    exportButton.click();
    fixture.detectChanges();

    const exported = app.portableJson;
    app.portableJson = '';
    app.portableJson = exported;

    const importButton = Array.from(compiled.querySelectorAll('.training-actions button')).find((button) =>
      button.textContent?.includes('JSONインポート')
    ) as HTMLButtonElement;
    importButton.click();
    fixture.detectChanges();

    expect(app.trainedStateCount).toBeGreaterThan(0);
    expect(compiled.textContent).toContain('JSONから学習データを復元しました');
  }));

  it('should ask confirmation before destructive training actions', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    fixture.detectChanges();

    app.switchTab('AGENT');
    app.clearTrainingData();
    app.deleteTrainingData();

    expect(confirmSpy).toHaveBeenCalledTimes(2);
    confirmSpy.mockRestore();
  });

  it('should highlight selected profile in compare workspace', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    fixture.detectChanges();

    app.switchTab('AGENT');
    app.setTrainingProfile('B');
    app.setAgentWorkspaceTab('COMPARE');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const selectedRow = compiled.querySelector('.profile-comparison tr.selected');
    expect(selectedRow?.textContent).toContain('プロファイル B');
  });

  it('should render agent matchup table in compare workspace', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    fixture.detectChanges();

    tick(50);
    app.switchTab('AGENT');
    app.setAgentWorkspaceTab('COMPARE');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const matchupTable = compiled.querySelector('[aria-label="agent win rate matchup table"]');
    expect(matchupTable).toBeTruthy();
    expect(matchupTable?.textContent).toContain('ランダム');
    expect(matchupTable?.textContent).toContain('ミニマックス');
  }));

  it('should update matchup table when refresh button is clicked', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    fixture.detectChanges();

    tick(50);
    app.switchTab('AGENT');
    app.setAgentWorkspaceTab('COMPARE');
    app.updateMatchupGamesPerPair(4);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const refreshButton = Array.from(compiled.querySelectorAll('.matchup-panel button')).find((button) =>
      button.textContent?.includes('対戦表を更新')
    ) as HTMLButtonElement;

    refreshButton.click();
    fixture.detectChanges();
    expect(refreshButton.disabled).toBe(true);

    tick(100);
    fixture.detectChanges();

    expect(refreshButton.disabled).toBe(false);
    const rateCells = Array.from(compiled.querySelectorAll('.matchup-table td')).filter(
      (cell) => cell.textContent?.includes('勝') && cell.textContent?.includes('分')
    );
    expect(rateCells.length).toBeGreaterThan(0);
    expect(compiled.querySelector('.matchup-message')?.textContent).toContain('更新完了');
  }));

  it('should show matchup progress while running', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    fixture.detectChanges();

    app.switchTab('AGENT');
    app.setAgentWorkspaceTab('COMPARE');
    app.updateMatchupGamesPerPair(60);
    app.refreshMatchupTable();
    fixture.detectChanges();

    expect(app.isMatchupRunning).toBe(true);
    expect(app.matchupMessage).toContain('進捗');

    tick(300);
    fixture.detectChanges();
    expect(app.isMatchupRunning).toBe(false);
  }));

  it('should switch overlay assistant to minimax by selecting from dropdown', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const overlaySelect = compiled.querySelector('#overlay-assistant-select') as HTMLSelectElement;

    overlaySelect.value = 'MINIMAX';
    overlaySelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.overlay-rate').length).toBeGreaterThan(0);
    expect(compiled.querySelector('.overlay-status')?.textContent).toContain('ミニマックス');
  });

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

    app.setOverlayAssistant('MONTE_CARLO');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.overlay-rate').length).toBeGreaterThan(0);
    expect(compiled.querySelector('.overlay-status')?.textContent).toContain('現在局面評価');

    randomSpy.mockRestore();
  });

  it('should keep overlay visible after switching turn', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;

    app.setOverlayAssistant('MONTE_CARLO');
    app.play(0);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(app.currentPlayer).toBe('O');
    expect(compiled.querySelectorAll('.overlay-rate').length).toBeGreaterThan(0);
    expect(compiled.querySelector('.overlay-status')?.textContent).toContain('O 視点');

    randomSpy.mockRestore();
  });

  it('should show minimax overlay when overlay assistant is minimax', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;

    app.setOverlayAssistant('MINIMAX');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.overlay-rate').length).toBeGreaterThan(0);
    expect(compiled.querySelector('.overlay-status')?.textContent).toContain('ミニマックス');
  });

  it('should show q-learning overlay when overlay assistant is q-learning', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;

    app.setOverlayAssistant('Q_LEARNING');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.overlay-rate').length).toBeGreaterThan(0);
    expect(compiled.querySelector('.overlay-status')?.textContent).toContain('Q学習');
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

  it('should switch q-learning play profile from dropdown', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;

    app.setAgent('O', 'Q_LEARNING');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const profileSelect = compiled.querySelector('#play-profile-select') as HTMLSelectElement;
    profileSelect.value = 'B';
    profileSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(compiled.querySelector('.mode')?.textContent).toContain('Q学習（プロファイル B）');
  });

  it('should keep training configuration per profile', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    fixture.detectChanges();

    app.switchTab('AGENT');
    fixture.detectChanges();

    app.updateEpisodes(1234);
    app.setTrainingProfile('B');
    app.updateEpisodes(5678);
    app.setTrainingProfile('A');

    expect(app.trainingConfig.episodes).toBe(1234);
    app.setTrainingProfile('B');
    expect(app.trainingConfig.episodes).toBe(5678);
  });
});
