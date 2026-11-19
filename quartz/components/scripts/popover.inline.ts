import { computePosition, flip, inline, shift } from "@floating-ui/dom"
import { normalizeRelativeURLs } from "../../util/path"
import { fetchCanonical } from "./util"

const p = new DOMParser()
let activeAnchor: HTMLAnchorElement | null = null

function getPopoverAncestors(element: HTMLElement | null): Set<HTMLElement> {
  const ancestors = new Set<HTMLElement>()
  let current: HTMLElement | null = element
  while (current) {
    if (current.classList.contains("popover")) {
      ancestors.add(current)
      const parentId = current.dataset.parentPopover
      current = parentId ? (document.getElementById(parentId) as HTMLElement | null) : null
    } else {
      current = current.parentElement
    }
  }
  return ancestors
}

function clearActivePopovers(keep?: Set<HTMLElement>) {
  const allPopoverElements = document.querySelectorAll(".popover")
  allPopoverElements.forEach((popoverElement) => {
    if (!keep || !keep.has(popoverElement as HTMLElement)) {
      popoverElement.classList.remove("active-popover")
    }
  })
}

async function mouseEnterHandler(
  this: HTMLAnchorElement,
  { clientX, clientY }: { clientX: number; clientY: number },
) {
  const link = (activeAnchor = this)
  if (link.dataset.noPopover === "true") {
    return
  }

  const targetUrl = new URL(link.href)
  const hash = decodeURIComponent(targetUrl.hash)
  targetUrl.hash = ""
  targetUrl.search = ""
  const popoverId = `popover-${link.pathname}`
  const parentPopover = link.closest(".popover") as HTMLElement | null

  // Prevent circular self-nesting inside the same popover
  if (parentPopover && parentPopover.id === popoverId) {
    return
  }

  async function setPosition(popoverElement: HTMLElement) {
    const { x, y } = await computePosition(link, popoverElement, {
      strategy: "fixed",
      middleware: [inline({ x: clientX, y: clientY }), shift(), flip()],
    })
    Object.assign(popoverElement.style, {
      transform: `translate(${x.toFixed()}px, ${y.toFixed()}px)`,
    })
  }

  function showPopover(popoverElement: HTMLElement) {
    const ancestors = getPopoverAncestors(link)
    ancestors.add(popoverElement)
    clearActivePopovers(ancestors)

    if (parentPopover) {
      popoverElement.dataset.parentPopover = parentPopover.id
      const parentZ = parseInt(popoverElement.style.getPropertyValue("--popover-z") || parentPopover.style.zIndex || "1000", 10)
      popoverElement.style.setProperty("--popover-z", String(parentZ + 10))
      popoverElement.style.zIndex = String(parentZ + 10)
    } else {
      popoverElement.dataset.parentPopover = ""
      popoverElement.style.setProperty("--popover-z", "1000")
      popoverElement.style.zIndex = "1000"
    }

    popoverElement.classList.add("active-popover")
    setPosition(popoverElement as HTMLElement)

    if (hash !== "") {
      const inner = popoverElement.querySelector(".popover-inner") as HTMLElement | null
      if (inner) {
        const targetAnchor = `#popover-internal-${hash.slice(1)}`
        const heading = inner.querySelector(targetAnchor) as HTMLElement | null
        if (heading) {
          inner.scroll({ top: heading.offsetTop - 12, behavior: "instant" })
        }
      }
    }
  }

  const prevPopoverElement = document.getElementById(popoverId)

  // dont refetch if there's already a popover
  if (!!document.getElementById(popoverId)) {
    showPopover(prevPopoverElement as HTMLElement)
    return
  }

  // A page fetched ahead (prefetch.inline.ts) is used as is, instead of fetching it again.
  const prefetched = await window.quartzPrefetch?.load(targetUrl)
  const response = prefetched
    ? undefined
    : await fetchCanonical(targetUrl).catch((err) => {
        console.error(err)
      })

  if (!prefetched && !response) return
  const rawContentType = prefetched?.contentType ?? response?.headers.get("Content-Type")
  if (!rawContentType) return
  const [contentType] = rawContentType.split(";")
  const [contentTypeCategory, typeInfo] = contentType.split("/")

  const popoverElement = document.createElement("div")
  popoverElement.id = popoverId
  popoverElement.classList.add("popover")
  const popoverInner = document.createElement("div")
  popoverInner.classList.add("popover-inner")
  popoverInner.dataset.contentType = contentType ?? undefined
  popoverElement.appendChild(popoverInner)

  popoverElement.addEventListener("mouseleave", () => {
    setTimeout(() => {
      const isChildHovered = [...document.querySelectorAll(".popover.active-popover")].some(
        (child) => (child as HTMLElement).dataset.parentPopover === popoverElement.id && child.matches(":hover")
      )
      if (!popoverElement.matches(":hover") && !isChildHovered) {
        popoverElement.classList.remove("active-popover")
      }
    }, 150)
  })

  switch (contentTypeCategory) {
    case "image":
      const img = document.createElement("img")
      img.src = targetUrl.toString()
      img.alt = targetUrl.pathname

      popoverInner.appendChild(img)
      break
    case "application":
      switch (typeInfo) {
        case "pdf":
          const pdf = document.createElement("iframe")
          pdf.src = targetUrl.toString()
          popoverInner.appendChild(pdf)
          break
        default:
          break
      }
      break
    default:
      const contents = prefetched ? (prefetched.text ?? "") : await response!.text()
      const html = p.parseFromString(contents, "text/html")
      normalizeRelativeURLs(html, targetUrl)
      // prepend all IDs inside popovers to prevent duplicates
      html.querySelectorAll("[id]").forEach((el) => {
        const targetID = `popover-internal-${el.id}`
        el.id = targetID
      })
      const elts = [...html.getElementsByClassName("popover-hint")]
      if (elts.length === 0) return

      elts.forEach((elt) => popoverInner.appendChild(elt))
      // Recursively attach popover listeners to internal links within the newly loaded popover
      setupPopovers(popoverInner)
  }

  if (!!document.getElementById(popoverId)) {
    return
  }

  document.body.appendChild(popoverElement)
  if (activeAnchor !== this) {
    return
  }

  showPopover(popoverElement)
}

function mouseLeaveHandler(this: HTMLAnchorElement) {
  const popoverId = `popover-${this.pathname}`
  const targetPopover = document.getElementById(popoverId)
  setTimeout(() => {
    if (activeAnchor === this && !targetPopover?.matches(":hover")) {
      targetPopover?.classList.remove("active-popover")
      activeAnchor = null
    }
  }, 150)
}

function setupPopovers(container: ParentNode = document) {
  const links = [...container.querySelectorAll("a.internal")] as HTMLAnchorElement[]
  for (const link of links) {
    if (link.dataset.hasPopoverListener === "true") continue
    link.dataset.hasPopoverListener = "true"
    link.addEventListener("mouseenter", mouseEnterHandler)
    link.addEventListener("mouseleave", mouseLeaveHandler)
    window.addCleanup(() => {
      link.removeEventListener("mouseenter", mouseEnterHandler)
      link.removeEventListener("mouseleave", mouseLeaveHandler)
    })
  }
}

document.addEventListener("nav", () => setupPopovers(document))
document.addEventListener("render", () => setupPopovers(document))
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return
  activeAnchor = null
  document.querySelectorAll(".popover").forEach((popover) => popover.remove())
})
