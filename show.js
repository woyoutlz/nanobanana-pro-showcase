/**
 * page-gallery.js
 * 功能：在页面右下角生成一个浮动按钮，点击后显示当前页面所有图片的概览。
 * 点击概览图可跳转至原图位置并高亮显示。
 */
;(function () {
  "use strict"

  // 1. 注入 CSS 样式
  const style = document.createElement("style")
  style.textContent = `
        /* 浮动按钮样式 */
        #pg-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 9990;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 50%;
            width: 56px;
            height: 56px;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: transform 0.3s, box-shadow 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        @media (max-width: 768px) {
            #pg-btn {
                bottom: 15px;
                right: 15px;
                width: 48px;
                height: 48px;
                font-size: 20px;
            }
        }
        #pg-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }

        /* 模态框容器 */
        #pg-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            z-index: 10000;
            display: none;
            backdrop-filter: blur(5px);
            animation: pgFadeIn 0.2s ease;
            overflow-y: auto;
        }

        @keyframes pgFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        #pg-modal.show {
            display: block;
        }

        /* 画廊布局 */
        .pg-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        @media (max-width: 768px) {
            .pg-container {
                padding: 60px 0 20px 0; /* 移动端最小化padding */
            }
        }

        .pg-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            color: white;
            position: sticky;
            top: 0;
        }

        .pg-title {
            font-size: 24px;
            font-weight: bold;
        }
        
        .pg-count {
            font-size: 16px;
            font-weight: normal;
            color: #ccc;
            margin-left: 10px;
        }

        .pg-close {
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .pg-close:hover {
            background: #ff6b6b;
            border-color: #ff6b6b;
        }

        /* 网格系统 */
        .pg-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 16px;
        }

        /* 移动端适配：类似相册的5列密集视图 */
        @media (max-width: 768px) {
            .pg-grid {
                grid-template-columns: repeat(5, 1fr);
                gap: 0px; /* 完全去除gap */
            }
            .pg-container {
                padding: 60px 0 20px 0; /* 减小左右边距 */
            }
            .pg-item {
                border-radius: 0; /* 密集视图去除圆角 */
                border-width: 0; /* 去除边框以节省空间 */
                margin: 0; /* 去除margin */
            }
            .pg-item:hover {
                transform: none; /* 移动端取消悬停放大 */
                z-index: 0;
            }
            .pg-item-idx {
                font-size: 9px;
                padding: 1px 3px;
            }
        }

        .pg-item {
            position: relative;
            aspect-ratio: 1;
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            border: 2px solid transparent;
            transition: transform 0.2s, border-color 0.2s;
            background: #222;
        }

        .pg-item:hover {
            transform: translateY(-4px);
            border-color: #764ba2;
            z-index: 1;
        }

        .pg-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .pg-item-idx {
            position: absolute;
            bottom: 0;
            right: 0;
            background: rgba(0,0,0,0.6);
            color: white;
            padding: 2px 8px;
            font-size: 12px;
            border-top-left-radius: 6px;
        }

        /* 高亮动画 */
        .pg-highlight {
            animation: pgPulse 2s ease-out;
            scroll-margin-top: 20vh; /* 滚动留白 */
        }

        @keyframes pgPulse {
            0% { outline: 4px solid #FFD700; box-shadow: 0 0 20px #FFD700; }
            50% { outline: 4px solid #FFD700; box-shadow: 0 0 20px #FFD700; }
            100% { outline: 4px solid transparent; box-shadow: none; }
        }
    `
  document.head.appendChild(style)

  // 2. 创建 DOM 结构
  const btn = document.createElement("button")
  btn.id = "pg-btn"
  btn.title = "打开页面图片概览"
  btn.innerHTML = "🖼️"
  document.body.appendChild(btn)

  const modal = document.createElement("div")
  modal.id = "pg-modal"
  modal.innerHTML = `
        <div class="pg-container">
            <div class="pg-header">
                <div class="pg-title">当前页面图片 <span class="pg-count"></span></div>
                <button class="pg-close">关闭 (ESC)</button>
            </div>
            <div class="pg-grid"></div>
        </div>
    `
  document.body.appendChild(modal)

  // 3. 核心功能：获取图片
  function getImages() {
    const images = []
    // 排除掉本插件自身的图片和极小的图标
    const candidates = document.querySelectorAll(
      "img:not(#pg-modal img):not(#pg-btn img)"
    )

    candidates.forEach((img, index) => {
      // 只收集可见的、有尺寸的图片
      const rect = img.getBoundingClientRect()
      if (img.src && rect.width > 20 && rect.height > 20) {
        images.push({
          element: img,
          src: img.src,
          index: index,
        })
      }
    })
    return images
  }

  // 4. 事件绑定
  const grid = modal.querySelector(".pg-grid")
  const count = modal.querySelector(".pg-count")

  // 打开画廊
  btn.addEventListener("click", () => {
    const images = getImages()
    grid.innerHTML = ""
    count.textContent = `(${images.length})`

    if (images.length === 0) {
      grid.innerHTML =
        '<div style="color:white; grid-column:1/-1; text-align:center;">当前视口未检测到有效图片</div>'
    } else {
      images.forEach((imgItem, idx) => {
        const item = document.createElement("div")
        item.className = "pg-item"

        const thumb = document.createElement("img")
        thumb.src = imgItem.src
        thumb.loading = "lazy" // 懒加载概览图

        const idxLabel = document.createElement("div")
        idxLabel.className = "pg-item-idx"
        idxLabel.textContent = `#${idx + 1}`

        item.appendChild(thumb)
        item.appendChild(idxLabel)

        // 点击跳转逻辑
        item.addEventListener("click", (e) => {
          e.stopPropagation()
          closeGallery()

          // 滚动并高亮
          imgItem.element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })

          // 重置动画以支持重复触发
          imgItem.element.classList.remove("pg-highlight")
          void imgItem.element.offsetWidth // 强制重绘
          imgItem.element.classList.add("pg-highlight")

          // 2秒后移除类
          setTimeout(() => {
            imgItem.element.classList.remove("pg-highlight")
          }, 2000)
        })

        grid.appendChild(item)
      })
    }
    modal.classList.add("show")
    document.body.style.overflow = "hidden" // 锁定背景滚动
  })

  // 关闭画廊
  function closeGallery() {
    modal.classList.remove("show")
    document.body.style.overflow = "" // 恢复背景滚动
  }

  modal.querySelector(".pg-close").addEventListener("click", closeGallery)

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("pg-container")) {
      closeGallery()
    }
  })

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("show")) {
      closeGallery()
    }
  })
})()
