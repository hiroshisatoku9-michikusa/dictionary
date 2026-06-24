# 誤読辞書

`semantic_shift_top100.md` を初期データにした、カード形式の私的辞書です。

公開URL: https://hiroshisatoku9-michikusa.github.io/dictionary/

## 開き方

`index.html` をブラウザで開きます。データは `dictionary-data.js` に埋め込んでいるので、ローカルファイルとしてそのまま表示できます。

## 更新方法

1. `semantic_shift_top100.md` を更新する
2. 次を実行する

```sh
python3 misreading-dictionary/tools/build_dictionary.py
```

これで `dictionary_entries.json` と `dictionary-data.js` が再生成されます。

## 手で育てる場合

`manual_entries.json` に以下の形で語を追加してから、更新コマンドを実行します。`dictionary_entries.json` と `dictionary-data.js` は生成物なので、直接編集しない方が安全です。

```json
{
  "id": "101-new-word",
  "rank": 101,
  "term": {
    "ja": "新しい語",
    "en": "New word"
  },
  "kana": "",
  "category": {
    "ja": "その他",
    "en": "Other"
  },
  "standardMeaning": {
    "ja": "標準的には...",
    "en": "In standard usage..."
  },
  "misreading": {
    "ja": "この文章群では...",
    "en": "In this private lexicon..."
  },
  "sources": [
    {
      "title": "Article title",
      "url": "https://medium.com/..."
    }
  ],
  "notes": "",
  "status": "draft"
}
```
