#!/usr/bin/env python3
import subprocess, time, os
from pathlib import Path

SKILL_DIR = Path("/Users/sawaosamu/.claude/skills/nanobanana-deji")
OUT_DIR = Path("/Users/sawaosamu/Desktop/ツール開発/dejiina_agent/output/ai-fukugyou-nyumon/images")
OUT_DIR.mkdir(parents=True, exist_ok=True)

env = os.environ.copy()
with open("/Users/sawaosamu/Desktop/ツール開発/dejiina_agent/.env") as f:
    for line in f:
        if "=" in line:
            k, v = line.strip().split("=", 1)
            env[k] = v

images = [
    ("ch1_header.png", "landscape", "Before-after comparison infographic. Left side labeled AI登場前: stressed worker surrounded by books, dark colors. Right side labeled AI登場後: relaxed person with laptop and AI assistant, bright colors. Title text reads AI副業革命. IMPORTANT: FULL COLOR illustration with vibrant rich colors. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch1_img1.png", "landscape", "Staircase steps infographic showing AI evolution timeline. 4 ascending stairs going up-right. Step 1 text reads 2022年: ChatGPT登場. Step 2 text reads 2023年: 副業活用が加速. Step 3 text reads 2024年: 月10万が現実的に. Step 4 text reads 2026年: 月収100万超も登場. Each step has icon. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch1_img2.png", "landscape", "Radial hub-and-spoke diagram. Center hub text reads 会社員がAI副業に向いている理由. 4 spokes with icons: スキマ時間活用 with clock icon, 安定収入がある with coins icon, リスクゼロで始められる with shield icon, 本業の知識が武器になる with briefcase icon. Clean flat design. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch1_img3.png", "landscape", "Gantt-style horizontal bar chart. Title text reads 月10万円達成ロードマップ. Row 1: 1〜2ヶ月目 short bar showing 月1〜3万円. Row 2: 3〜4ヶ月目 medium bar showing 月3〜7万円. Row 3: 5〜6ヶ月目 long bar showing 月7〜10万円. Gradient bars getting longer. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch2_header.png", "landscape", "Comparison table infographic with 3 columns. Title text reads AI副業おすすめツール比較. Column 1: ChatGPT, robot icon, 月約3000円, 汎用・文章生成. Column 2: Claude, brain icon, 月約3000円, 長文・分析. Column 3: Canva AI, palette icon, 無料〜月1500円, デザイン・画像. Clean modern design. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch2_img1.png", "landscape", "Triangle diagram. Title text reads AI副業の三角形. Top corner text reads ChatGPT（文章・汎用）. Bottom-left corner text reads Claude（長文・分析）. Bottom-right corner text reads Canva AI（画像・デザイン）. Center text reads 最初の3ツール. Colorful triangle design. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch2_img2.png", "landscape", "Split comparison infographic. Title text reads ChatGPTとClaudeの使い分け. Left half labeled ChatGPT向き with icons for アイデア出し, 短文, 翻訳. Right half labeled Claude向き with icons for 長文, 論理, コード. Clean flat design. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch2_img3.png", "landscape", "Horizontal flow diagram with 4 steps and arrows. Title text reads Canvaで稼ぐ流れ. Step 1: template icon, text reads テンプレート選択. Step 2: magic wand icon, text reads AI生成. Step 3: pencil icon, text reads カスタマイズ. Step 4: checkmark icon, text reads 納品. Arrows connecting steps. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch3_header.png", "landscape", "Layered stacked diagram with 5 levels. Title text reads AI副業5つのカテゴリ. Layer 1 bottom text reads AIライティング. Layer 2 text reads SNS運用代行. Layer 3 text reads AI画像生成販売. Layer 4 text reads プロンプト販売. Layer 5 top text reads Web制作. Each layer different color. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch3_img1.png", "landscape", "2x2 matrix quadrant chart. Title text reads AI副業選択マトリクス. X-axis label: 稼ぎやすさ. Y-axis label: 始めやすさ. 5 colored bubbles: AIライティング top-right, SNS運用 top-right area, AI画像販売 bottom-right, プロンプト販売 top-left, Web制作 bottom-left. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch3_img2.png", "landscape", "Vertical flow diagram with 4 steps. Title text reads SNS運用代行の業務フロー. Step 1: handshake icon, text reads クライアント獲得. Step 2: lightbulb icon, text reads コンセプト設計. Step 3: robot writing icon, text reads AI投稿作成. Step 4: bar chart icon, text reads 分析・改善. Down arrows between steps. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch3_img3.png", "landscape", "Circular cycle diagram with 5 nodes. Title text reads AI画像販売の収益サイクル. Nodes in circle: 画像生成 → 出品 → 売れる → 収益再投資 → 画像追加 → back to 画像生成. Arrows showing clockwise flow. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch3_img4.png", "landscape", "Before-after comparison. Title text reads Web制作の革命. Left before: person studying thick programming books, text reads 以前：HTMLやCSSを1〜2年学習が必要. Right after: person chatting with AI on laptop, smiling, text reads 現在：Claude Codeで指示するだけ・未経験でもOK. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch4_header.png", "landscape", "Staircase infographic with person climbing. Title text reads 月10万円達成6ヶ月ロードマップ. 4 steps: Step 1 text reads 準備期（0〜2週）. Step 2 text reads 立ち上げ期（1〜2ヶ月）. Step 3 text reads 成長期（3〜4ヶ月）. Step 4 text reads 安定期（5〜6ヶ月）. Small person figure climbing stairs. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch4_img1.png", "landscape", "Vertical checklist infographic. Title text reads 準備期にやること. 4 checklist items with colorful checkboxes: AIツール登録（ChatGPT・Claude）, クラウドソーシング登録（クラウドワークス・ランサーズ）, プロフィール作成, 副業口座開設. Clean modern design. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch4_img2.png", "landscape", "Horizontal flow diagram with 5 steps. Title text reads 立ち上げ期の行動計画. Steps with arrows: 案件に5件応募 → 1件受注 → 納品 → レビューをもらう → 次の案件へ. Progress bar style design. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch4_img3.png", "landscape", "Pyramid diagram with 3 levels. Title text reads 収入を上げる3ステップ. Bottom wide level text reads 第1段階：実績を作る. Middle level text reads 第2段階：単価交渉. Top narrow level text reads 第3段階：専門特化で高単価. Colors getting brighter toward top. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch5_header.png", "landscape", "Network hub-and-spoke diagram. Title text reads 収入加速の5つのレバー. Center node text reads 月10万円突破. 5 connected nodes: 単価アップ, リピート獲得, 外注化, 商品販売, 自動化. Lines connecting all to center. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch5_img1.png", "landscape", "Scale comparison with two circles of different sizes. Title text reads 専門性による単価の差. Left small circle text reads 一般ライター：文字単価1〜2円. Right large circle text reads 専門ライター：文字単価5〜10円. Size difference clearly visible. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch5_img2.png", "landscape", "Vertical flow diagram with circular loop arrow. Title text reads プロンプト販売の仕組み. 4 steps: 高品質プロンプト作成 → noteで販売 → 収益発生 → プロンプト追加 → loops back. Down arrows and loop indicator. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("ch5_img3.png", "landscape", "Concentric circles diagram. Title text reads 収入の多層化モデル. Innermost circle: 本業収入. Second ring: AI副業収入. Third ring: プロンプト販売. Outermost ring: コンテンツ販売. Each ring different color getting lighter outward. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
    ("outro_img1.png", "landscape", "Horizontal 3-step action plan. Title text reads 今日からの3ステップ. Step 1: calendar icon, text reads 今日：ChatGPTに登録する. Step 2: profile icon, text reads 今週：クラウドワークスに登録してプロフィール完成. Step 3: rocket icon, text reads 今月末：初めての案件に応募する. Bright motivational colors. IMPORTANT: FULL COLOR. 画像内のテキストは必ず日本語で表記してください。"),
]

success, failed = 0, []
for filename, aspect, prompt in images:
    out_path = OUT_DIR / filename
    if out_path.exists() and out_path.stat().st_size > 10000:
        print(f"[SKIP] {filename}")
        success += 1
        continue
    print(f"[GEN] {filename}...")
    result = subprocess.run(
        ["python3", "scripts/generate.py", "--prompt", prompt, "--output", str(out_path), "--aspect", aspect, "--style", "flat design infographic"],
        cwd=str(SKILL_DIR), capture_output=True, text=True, env=env
    )
    if result.returncode == 0:
        print(f"[OK] {filename}")
        success += 1
    else:
        print(f"[ERROR] {filename}: {result.stderr[-200:]}")
        failed.append(filename)
    time.sleep(3)

print(f"\n完了: {success}/{len(images)+1} 成功")
if failed:
    print(f"失敗: {failed}")
