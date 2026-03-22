const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../shopping-list.html').replace(/\\/g, '/');

test.beforeEach(async ({ page }) => {
  await page.goto(FILE_URL);
  // localStorage 초기화 (테스트 격리)
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ─────────────────────────────────────────────
// 1. 초기 상태
// ─────────────────────────────────────────────
test('초기 상태: 빈 리스트와 안내 메시지 표시', async ({ page }) => {
  await expect(page.locator('#emptyMsg')).toBeVisible();
  await expect(page.locator('#statsText')).toHaveText('총 0개 · 완료 0개');
  await expect(page.locator('li')).toHaveCount(0);
});

// ─────────────────────────────────────────────
// 2. 아이템 추가
// ─────────────────────────────────────────────
test('버튼 클릭으로 아이템 추가', async ({ page }) => {
  await page.fill('#itemInput', '우유');
  await page.click('button:has-text("추가")');

  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.locator('.item-text').first()).toHaveText('우유');
  await expect(page.locator('#emptyMsg')).toBeHidden();
  await expect(page.locator('#statsText')).toHaveText('총 1개 · 완료 0개');
});

test('Enter 키로 아이템 추가', async ({ page }) => {
  await page.fill('#itemInput', '계란');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.locator('.item-text').first()).toHaveText('계란');
});

test('여러 아이템 연속 추가', async ({ page }) => {
  const items = ['사과', '바나나', '오렌지'];
  for (const item of items) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  await expect(page.locator('li')).toHaveCount(3);
  await expect(page.locator('#statsText')).toHaveText('총 3개 · 완료 0개');
  for (const item of items) {
    await expect(page.locator('.item-text', { hasText: item })).toBeVisible();
  }
});

test('빈 입력으로 추가 시 아이템 생성 안 됨', async ({ page }) => {
  await page.fill('#itemInput', '   ');
  await page.click('button:has-text("추가")');

  await expect(page.locator('li')).toHaveCount(0);
});

test('추가 후 입력창 자동 초기화', async ({ page }) => {
  await page.fill('#itemInput', '두부');
  await page.press('#itemInput', 'Enter');

  await expect(page.locator('#itemInput')).toHaveValue('');
});

// ─────────────────────────────────────────────
// 3. 아이템 체크
// ─────────────────────────────────────────────
test('체크박스 클릭 시 취소선 및 스타일 변경', async ({ page }) => {
  await page.fill('#itemInput', '치즈');
  await page.press('#itemInput', 'Enter');

  const li = page.locator('li').first();
  await li.locator('input[type="checkbox"]').check();

  await expect(li).toHaveClass(/checked/);
  await expect(page.locator('#statsText')).toHaveText('총 1개 · 완료 1개');
});

test('체크박스 재클릭 시 체크 해제', async ({ page }) => {
  await page.fill('#itemInput', '요거트');
  await page.press('#itemInput', 'Enter');

  const checkbox = page.locator('li').first().locator('input[type="checkbox"]');
  await checkbox.check();
  await checkbox.uncheck();

  await expect(page.locator('li').first()).not.toHaveClass(/checked/);
  await expect(page.locator('#statsText')).toHaveText('총 1개 · 완료 0개');
});

test('여러 아이템 중 일부만 체크', async ({ page }) => {
  for (const item of ['빵', '버터', '잼']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  // 첫 번째, 세 번째 체크
  const items = page.locator('li');
  await items.nth(0).locator('input[type="checkbox"]').check();
  await items.nth(2).locator('input[type="checkbox"]').check();

  await expect(page.locator('#statsText')).toHaveText('총 3개 · 완료 2개');
  await expect(items.nth(0)).toHaveClass(/checked/);
  await expect(items.nth(1)).not.toHaveClass(/checked/);
  await expect(items.nth(2)).toHaveClass(/checked/);
});

// ─────────────────────────────────────────────
// 4. 아이템 삭제
// ─────────────────────────────────────────────
test('✕ 버튼으로 아이템 삭제', async ({ page }) => {
  await page.fill('#itemInput', '과자');
  await page.press('#itemInput', 'Enter');

  await page.locator('li').first().locator('.delete-btn').click();

  await expect(page.locator('li')).toHaveCount(0);
  await expect(page.locator('#emptyMsg')).toBeVisible();
});

test('여러 아이템 중 특정 아이템 삭제', async ({ page }) => {
  for (const item of ['콜라', '사이다', '주스']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  // 두 번째 항목(사이다) 삭제
  await page.locator('li').nth(1).locator('.delete-btn').click();

  await expect(page.locator('li')).toHaveCount(2);
  await expect(page.locator('.item-text', { hasText: '사이다' })).toHaveCount(0);
  await expect(page.locator('.item-text', { hasText: '콜라' })).toBeVisible();
  await expect(page.locator('.item-text', { hasText: '주스' })).toBeVisible();
});

// ─────────────────────────────────────────────
// 5. 완료 항목 일괄 삭제
// ─────────────────────────────────────────────
test('완료 항목 삭제 버튼으로 체크된 항목만 삭제', async ({ page }) => {
  for (const item of ['쌀', '김', '참기름']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  // 쌀, 참기름 체크
  const items = page.locator('li');
  await items.nth(0).locator('input[type="checkbox"]').check();
  await items.nth(2).locator('input[type="checkbox"]').check();

  await page.click('button.clear-done');

  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.locator('.item-text').first()).toHaveText('김');
});

test('체크된 항목이 없을 때 완료 삭제 버튼은 영향 없음', async ({ page }) => {
  for (const item of ['고추장', '된장']) {
    await page.fill('#itemInput', item);
    await page.press('#itemInput', 'Enter');
  }

  await page.click('button.clear-done');

  await expect(page.locator('li')).toHaveCount(2);
});

// ─────────────────────────────────────────────
// 6. localStorage 영속성
// ─────────────────────────────────────────────
test('페이지 새로고침 후에도 아이템 유지', async ({ page }) => {
  await page.fill('#itemInput', '세제');
  await page.press('#itemInput', 'Enter');

  const checkbox = page.locator('li').first().locator('input[type="checkbox"]');
  await checkbox.check();

  await page.reload();

  await expect(page.locator('li')).toHaveCount(1);
  await expect(page.locator('.item-text').first()).toHaveText('세제');
  await expect(page.locator('li').first()).toHaveClass(/checked/);
});
