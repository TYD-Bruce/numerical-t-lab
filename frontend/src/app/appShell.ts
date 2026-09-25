import type { RouteId } from "./contracts";
import { createThemeToggle } from "./theme";
import "../assets/fonts/fonts.css";
import "./theme.css";
import "./platform.css";

const NAVIGATION_ITEMS: ReadonlyArray<{
  label: string;
  href: string;
  routeId: RouteId;
}> = [
  { label: "Overview", href: "/", routeId: "home" },
  { label: "ODE", href: "/ode", routeId: "ode-overview" },
  {
    label: "Linear Algebra",
    href: "/linear-algebra",
    routeId: "linear-algebra-overview",
  },
  { label: "PDE", href: "/pde", routeId: "pde-overview" },
  { label: "About", href: "/about", routeId: "about" },
];

let mobileMenuId = 0;

export interface AppShell {
  root: HTMLElement;
  outlet: HTMLElement;
  tutorRegion: HTMLElement;
  glossaryRegion: HTMLElement;
  glossaryStatus: HTMLElement;
  modalBackgroundFor(owner: "tutor" | "glossary"): readonly HTMLElement[];
  setActiveRoute(routeId: RouteId): void;
  renderLoading(): void;
  renderFailure(onRetry: () => Promise<void>): void;
  navigationSucceeded(): void;
  closeMobileMenu(options?: { restoreFocus?: boolean }): void;
  dispose(): void;
}

function createNavigation(label: string, className: string): HTMLElement {
  const nav = document.createElement("nav");
  nav.className = className;
  nav.setAttribute("aria-label", label);
  const list = document.createElement("ul");
  list.className = "platform-nav-list";

  for (const item of NAVIGATION_ITEMS) {
    const listItem = document.createElement("li");
    const link = document.createElement("a");
    link.href = item.href;
    link.dataset.routeId = item.routeId;
    link.textContent = item.label;
    listItem.append(link);
    list.append(listItem);
  }

  nav.append(list);
  return nav;
}

export function createAppShell(target: HTMLElement): AppShell {
  const root = document.createElement("div");
  root.className = "platform-shell";

  const header = document.createElement("header");
  header.className = "platform-header";
  const headerInner = document.createElement("div");
  headerInner.className = "platform-header-inner";
  const brand = document.createElement("a");
  brand.className = "platform-brand";
  brand.href = "/";
  brand.textContent = "Numerical T Lab";

  const desktopNavigation = createNavigation("Primary", "platform-desktop-nav");
  const themeToggle = createThemeToggle();
  const menuId = `platform-mobile-menu-${++mobileMenuId}`;
  const menuTrigger = document.createElement("button");
  menuTrigger.type = "button";
  menuTrigger.className = "platform-mobile-menu-trigger";
  menuTrigger.dataset.mobileMenuTrigger = "true";
  menuTrigger.setAttribute("aria-expanded", "false");
  menuTrigger.setAttribute("aria-controls", menuId);
  menuTrigger.textContent = "Menu";

  const headerActions = document.createElement("div");
  headerActions.className = "platform-header-actions";
  headerActions.append(desktopNavigation, themeToggle.button, menuTrigger);
  headerInner.append(brand, headerActions);
  header.append(headerInner);

  const mobileMenu = document.createElement("div");
  mobileMenu.id = menuId;
  mobileMenu.className = "platform-mobile-menu";
  mobileMenu.dataset.mobileMenu = "true";
  mobileMenu.hidden = true;
  const mobileMenuHeader = document.createElement("div");
  mobileMenuHeader.className = "platform-mobile-menu-header";
  const mobileMenuTitle = document.createElement("strong");
  mobileMenuTitle.textContent = "Navigation";
  const menuClose = document.createElement("button");
  menuClose.type = "button";
  menuClose.dataset.mobileMenuClose = "true";
  menuClose.textContent = "Close menu";
  mobileMenuHeader.append(mobileMenuTitle, menuClose);
  mobileMenu.append(
    mobileMenuHeader,
    createNavigation("Mobile", "platform-mobile-navigation")
  );

  const outlet = document.createElement("main");
  outlet.id = "platform-route-outlet";
  outlet.className = "platform-route-outlet";
  outlet.tabIndex = -1;

  const tutorRegion = document.createElement("aside");
  tutorRegion.dataset.platformTutorHost = "true";
  tutorRegion.className = "platform-tutor-region";
  tutorRegion.setAttribute("aria-label", "Tutor tools");

  const glossaryRegion = document.createElement("div");
  glossaryRegion.dataset.platformGlossaryHost = "true";
  glossaryRegion.className = "platform-glossary-region";
  const glossaryStatus = document.createElement("p");
  glossaryStatus.className = "sr-only";
  glossaryStatus.dataset.platformGlossaryStatus = "true";
  glossaryStatus.setAttribute("role", "status");
  glossaryStatus.setAttribute("aria-live", "polite");

  const workspace = document.createElement("div");
  workspace.className = "platform-workspace";
  workspace.append(outlet, tutorRegion);

  root.append(header, mobileMenu, workspace, glossaryRegion, glossaryStatus);
  target.replaceChildren(root);

  const closeMobileMenu = (options: { restoreFocus?: boolean } = {}): void => {
    if (mobileMenu.hidden) return;
    mobileMenu.hidden = true;
    menuTrigger.setAttribute("aria-expanded", "false");
    if (options.restoreFocus) menuTrigger.focus();
  };

  const openMobileMenu = (): void => {
    mobileMenu.hidden = false;
    menuTrigger.setAttribute("aria-expanded", "true");
    menuClose.focus();
  };

  const onMenuTrigger = (): void => {
    if (mobileMenu.hidden) openMobileMenu();
    else closeMobileMenu({ restoreFocus: true });
  };
  const onMenuClose = (): void => closeMobileMenu({ restoreFocus: true });
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && !mobileMenu.hidden) {
      event.preventDefault();
      closeMobileMenu({ restoreFocus: true });
    }
  };

  menuTrigger.addEventListener("click", onMenuTrigger);
  menuClose.addEventListener("click", onMenuClose);
  document.addEventListener("keydown", onKeyDown);

  return {
    root,
    outlet,
    tutorRegion,
    glossaryRegion,
    glossaryStatus,
    modalBackgroundFor(owner) {
      return owner === "tutor"
        ? [header, mobileMenu, outlet, glossaryRegion]
        : [header, mobileMenu, outlet, tutorRegion];
    },
    setActiveRoute(routeId) {
      for (const link of root.querySelectorAll<HTMLElement>("[data-route-id]")) {
        link.removeAttribute("aria-current");
        link.classList.remove("is-module-active");
      }

      const parentRouteId =
        routeId === "ode-initial-value-problems"
          ? "ode-overview"
          : routeId === "linear-algebra-linear-systems"
            ? "linear-algebra-overview"
            : routeId;
      if (routeId === "not-found") return;

      for (const link of root.querySelectorAll<HTMLElement>(
        `[data-route-id="${parentRouteId}"]`
      )) {
        if (
          routeId === "ode-initial-value-problems" ||
          routeId === "linear-algebra-linear-systems"
        ) {
          link.setAttribute("aria-current", "location");
          link.classList.add("is-module-active");
        } else {
          link.setAttribute("aria-current", "page");
        }
      }
    },
    renderLoading() {
      outlet.setAttribute("aria-busy", "true");
      const panel = document.createElement("section");
      panel.className = "platform-state-panel";
      panel.setAttribute("role", "status");
      panel.setAttribute("aria-live", "polite");
      const heading = document.createElement("h1");
      heading.textContent = "Loading page";
      const message = document.createElement("p");
      message.textContent = "Preparing this part of the lab platform.";
      panel.append(heading, message);
      outlet.replaceChildren(panel);
    },
    renderFailure(onRetry) {
      outlet.removeAttribute("aria-busy");
      const panel = document.createElement("section");
      panel.className = "platform-state-panel";
      panel.setAttribute("role", "alert");
      const heading = document.createElement("h1");
      heading.tabIndex = -1;
      heading.dataset.routeFocus = "true";
      heading.textContent = "This page could not load";
      const message = document.createElement("p");
      message.textContent =
        "The page or Lab could not load. You can retry without affecting other routes.";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Retry";
      retry.addEventListener("click", () => {
        void onRetry();
      });
      panel.append(heading, message, retry);
      outlet.replaceChildren(panel);
    },
    navigationSucceeded() {
      outlet.removeAttribute("aria-busy");
      closeMobileMenu();
    },
    closeMobileMenu,
    dispose() {
      menuTrigger.removeEventListener("click", onMenuTrigger);
      menuClose.removeEventListener("click", onMenuClose);
      document.removeEventListener("keydown", onKeyDown);
      themeToggle.dispose();
      root.remove();
    },
  };
}
