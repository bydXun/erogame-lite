window.EROGAME_POSTS = [
  {
    "slug": "silksong-after-ending",
    "title": "通关后，我为什么还想再走一遍",
    "summary": "不是因为地图更大，也不是因为 Boss 更难，而是它总能在最安静的角落，重新让我想起第一次进入圣巢时的那种不安和好奇。",
    "type": "game",
    "category": "游戏感想",
    "tags": [
      "动作冒险",
      "探索",
      "无剧透",
      "游玩记录"
    ],
    "date": "2026-09-28",
    "cover": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=84",
    "featured": true,
    "content": "\n      <div class=\"callout warning\">\n        <strong>剧透提示：</strong>本文只讨论整体体验、地图节奏和设计感受，不展开关键剧情和结局内容。\n      </div>\n      <h2 id=\"conclusion\">先说结论</h2>\n      <p>它没有试图把所有东西都做得更大。真正让人愿意留下来的，是探索时那种没有被打断的安静感，以及每一条路都可能通向未知的期待。</p>\n      <p>如果只把它看作一部难度更高的续作，会错过很多细节。它更像是在原作的骨架上，重新调整了移动、战斗和地图之间的关系。</p>\n      <h2 id=\"experience\">游玩体验</h2>\n      <p>最明显的改变是节奏。前期依旧克制，路线不会一次性全部打开，但每一次获得新能力之后，旧地图都会重新产生意义。</p>\n      <blockquote>好的探索游戏不会告诉你“这里以后再来”，而是让你在回来时，真的记得当初为什么过不去。</blockquote>\n      <p>战斗手感比前作更直接，空中动作和位移的衔接也更丰富。部分战斗确实更困难，但失败后很快就能重新组织路线，不会让人长时间卡在重复操作里。</p>\n      <h2 id=\"map\">地图与节奏</h2>\n      <p>地图仍然需要自己购买和补全，这一点没有改变。不同的是，这一作对区域之间的连接处理得更自然，很多回头路会因为新的能力变成捷径。</p>\n      <div class=\"key-points\">\n        <h3>印象比较深的设计</h3>\n        <ul>\n          <li>区域主题明确，但不会只用颜色区分。</li>\n          <li>新能力同时服务于战斗、移动和探索。</li>\n          <li>隐藏路线很多，但大多可以通过环境细节判断。</li>\n          <li>Boss 战更强调观察节奏，而不是单纯堆伤害。</li>\n        </ul>\n      </div>\n      <h2 id=\"moments\">三个记忆点</h2>\n      <p>第一次穿过长椅附近的暗道，第一次用新能力回到旧区域，第一次在没有准备的情况下遇见隐藏 Boss。这些都是很小的瞬间，却比单纯的数值成长更容易被记住。</p>\n      <p>另一个让我喜欢的细节，是音乐和场景没有急着制造“宏大感”。很多地方只是安静地放着环境声，让探索本身成为主角。</p>\n      <h2 id=\"recommend\">适合谁玩</h2>\n      <p>如果你喜欢自己辨认地图、接受短暂迷路，并愿意从失败中重新理解战斗节奏，它会非常合适。如果你更希望任务清单清楚地告诉你下一步去哪，前期可能会有些疲惫。</p>\n      <p>但即使不追求全收集，它依然值得完整走一遍。因为真正让人记住的，不是通关那一刻，而是途中那些看似没有奖励、却让人愿意绕远路的探索。</p>\n    "
  },
  {
    "slug": "ai-personal-knowledge-base",
    "title": "从零搭建 AI 个人知识库：完整工具链与避坑记录",
    "summary": "从资料收集、清洗到日常检索，我把真正会长期使用的环节留了下来。文章包含步骤检查、代码说明和失败排查。",
    "type": "tutorial",
    "category": "教程",
    "tags": [
      "AI 工具",
      "知识库",
      "效率",
      "实践记录"
    ],
    "date": "2026-09-24",
    "cover": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=84",
    "featured": true,
    "content": "\n      <p>一个能长期使用的知识库，重点不是接入多少工具，而是能不能稳定地完成收集、整理和检索这三件事。下面是我实际保留下来的一套流程。</p>\n      <h2 id=\"goal\">先确定目标</h2>\n      <p>我只处理会反复查阅的内容，例如教程、项目记录、产品文档和自己的经验总结。新闻、短期收藏和社交内容不会进入长期知识库。</p>\n      <div class=\"key-points\">\n        <h3>最小可行流程</h3>\n        <ol>\n          <li>把资料统一保存到收件箱。</li>\n          <li>每周清理一次，补齐标题、来源和标签。</li>\n          <li>只对真正重要的内容做向量化。</li>\n          <li>通过搜索结果回到原始资料，而不是让 AI 替代原文。</li>\n        </ol>\n      </div>\n      <h2 id=\"workflow\">推荐工作流</h2>\n      <p>资料先进入一个统一目录，再由简单脚本生成结构化索引。无论以后换成哪种 AI 工具，原始 Markdown 始终可以迁移。</p>\n      <pre><code>source/\n  inbox/\n  notes/\n  projects/\nindex/\n  documents.json\n  vectors.db</code></pre>\n      <h2 id=\"search\">检索与回答</h2>\n      <p>搜索时必须显示来源和原始段落。对于没有明确来源的回答直接标记为不确定，避免把模型生成的内容重新写回知识库。</p>\n      <h2 id=\"pitfalls\">常见问题</h2>\n      <ul>\n        <li>文件切分过大，检索结果经常缺少上下文。</li>\n        <li>只保存摘要，不保存原文，后续无法核对。</li>\n        <li>所有内容都向量化，成本高，效果却没有明显提升。</li>\n        <li>没有定期清理，知识库很快退化成另一个收藏夹。</li>\n      </ul>\n    "
  },
  {
    "slug": "game-without-checklist",
    "title": "没有任务清单，却让我连续玩了 40 小时",
    "summary": "它没有逼着玩家清空地图，也没有用醒目的奖励提示牵着人走。真正留下我的，是每次抬头都能看见远处还有一条路。",
    "type": "game",
    "category": "游戏感想",
    "tags": [
      "开放世界",
      "探索",
      "游玩记录"
    ],
    "date": "2026-09-19",
    "cover": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=84",
    "featured": false,
    "content": "\n      <h2 id=\"discovery\">探索比奖励更重要</h2>\n      <p>地图上没有密集图标，也没有每一步都告诉你还剩多少进度。它只是把一些有意义的地点放在远处，让玩家自己判断要不要过去。</p>\n      <p>刚开始我会担心错过内容，后来才发现，错过本身就是这种游戏的一部分。你只能选择一条路，而另一条路会留在想象里。</p>\n      <h2 id=\"rhythm\">节奏非常特别</h2>\n      <p>有些区域适合快速通过，有些区域则应该慢下来观察。游戏没有强制区分，玩家自己的情绪和状态决定了游玩节奏。</p>\n      <blockquote>不是所有探索都需要奖励确认。有时看见远处亮着一盏灯，本身就是继续前进的理由。</blockquote>\n      <h2 id=\"memory\">留下来的记忆</h2>\n      <p>真正记得的不是获得了什么，而是在雨天穿过树林、在悬崖边等待日出，以及绕了很远之后终于找到回程的路。</p>\n    "
  },
  {
    "slug": "screenshot-to-draft",
    "title": "从截图到成稿：我的游戏记录工作流",
    "summary": "如何整理游玩截图、时间线和零散想法，最后写成一篇完整感想。",
    "type": "tutorial",
    "category": "教程",
    "tags": [
      "写作",
      "工作流",
      "游戏记录"
    ],
    "date": "2025-12-08",
    "cover": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=84",
    "featured": false,
    "content": "\n      <h2 id=\"capture\">游玩时只做记录</h2>\n      <p>游玩过程中不急着写完整句子，只记录时间点、截图和当下最直接的情绪。判断可以留到文章开始整理时再做。</p>\n      <h2 id=\"organize\">按主题而不是时间整理</h2>\n      <p>通关流程可以作为参考，但文章结构更应该围绕主题，例如战斗、地图、角色、节奏和最后的整体判断。</p>\n      <div class=\"key-points\">\n        <h3>每篇感想至少保留三类材料</h3>\n        <ul>\n          <li>能说明观点的实际经历。</li>\n          <li>支持经历的截图或场景。</li>\n          <li>前后发生变化的主观判断。</li>\n        </ul>\n      </div>\n      <h2 id=\"draft\">最后再写结论</h2>\n      <p>结论放在最后写。先让材料决定文章会走向哪里，而不是一开始就找一个足够响亮的评价。</p>\n    "
  },
  {
    "slug": "astro-deploy-workflow",
    "title": "Astro 博客部署笔记：从本地预览到 Cloudflare Pages",
    "summary": "一次完整的静态博客部署记录，包括构建命令、环境变量、缓存和域名绑定。",
    "type": "tutorial",
    "category": "教程",
    "tags": [
      "Astro",
      "部署",
      "Cloudflare"
    ],
    "date": "2025-10-16",
    "cover": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&q=84",
    "featured": false,
    "content": "\n      <h2 id=\"prepare\">部署前检查</h2>\n      <p>先确认本地构建能够稳定通过，再检查 Node 版本、构建命令、输出目录和环境变量。部署平台的问题大多能先在本地复现。</p>\n      <h2 id=\"cloudflare\">连接 Cloudflare Pages</h2>\n      <p>把 GitHub 仓库连接到 Pages，生产分支选择主分支，构建命令填写项目实际使用的命令，输出目录填写构建产物目录。</p>\n      <pre><code>Build command: npm run build\nOutput directory: dist\nNode version: 22</code></pre>\n      <h2 id=\"domain\">绑定域名</h2>\n      <p>域名托管在 Cloudflare 时，自定义域记录的创建会比较简单。首次签发证书需要几分钟，完整生效前不要频繁修改 DNS。</p>\n    "
  },
  {
    "slug": "games-i-still-remember",
    "title": "通关很久以后，我还能记住哪些游戏瞬间",
    "summary": "不按评分整理，只记录那些过了很久依然能想起来的片段。",
    "type": "game",
    "category": "游戏感想",
    "tags": [
      "年度总结",
      "游戏记忆"
    ],
    "date": "2025-08-16",
    "cover": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=84",
    "featured": false,
    "content": "\n      <h2 id=\"moment-one\">第一次真正迷路</h2>\n      <p>不是因为没有地图，而是因为地图本身也需要理解。回到安全区域的那一刻，比直接获得答案更有满足感。</p>\n      <h2 id=\"moment-two\">没有台词的告别</h2>\n      <p>角色没有说很多话，只留下一个动作。多年以后想起这个游戏时，我首先想到的仍然不是剧情，而是那个停顿。</p>\n      <h2 id=\"moment-three\">重新回到开始的地方</h2>\n      <p>游戏快结束时，我回到最初经过的小路。那里没有任务、没有奖励，但背景音乐已经发生了变化。</p>\n    "
  },
  {
    "slug": "visual-novel-first-guide",
    "title": "第一次玩视觉小说，应该注意什么",
    "summary": "从路线选择、存档习惯到阅读节奏，一份不涉及具体剧情的新手入门说明。",
    "type": "tutorial",
    "category": "教程",
    "tags": [
      "视觉小说",
      "入门",
      "阅读习惯"
    ],
    "date": "2025-06-02",
    "cover": "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=84",
    "featured": false,
    "content": "\n      <h2 id=\"pace\">不要急着通关</h2>\n      <p>视觉小说的核心是阅读体验。第一条路线不一定要追求所谓的最佳结局，按照自己的选择读下去更容易留下真实感受。</p>\n      <h2 id=\"save\">保留关键存档</h2>\n      <p>重要选择之前保留独立存档，不要只依赖自动存档。这样既能体验不同路线，也不会因为一次选择重读大量内容。</p>\n      <h2 id=\"notes\">适当记录想法</h2>\n      <p>不需要写成完整笔记，只记录日期、路线和当时最强烈的感受。以后回看时，会比单纯的剧情摘要更有价值。</p>\n    "
  }
];
