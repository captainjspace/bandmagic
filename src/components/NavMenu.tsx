"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Link from "next/link";

interface MenuLink {
  index: number;
  name: string;
  displayName: string;
  href: string;
  description?: string | undefined;
  className?: string | undefined;
}

const menuLinks: MenuLink[] = [
  //  {
  //    index: 0,
  //    name: "rollingblackout",
  //    displayName: "Rolling Blackout",
  //    href: "/",
  //  },
  //
  {
    index: 1,
    name: "trackgroups",
    displayName: "Track Groups & Playlists",
    href: "/",
  },
  {
    index: 2,
    name: "songs",
    displayName: "Catalog: Songs & Tracks",
    href: "/browse",
  },
  { index: 3, name: "assets", displayName: "Assets", href: "/admin/assets" },
  { index: 4, name: "admin", displayName: "Admin", href: "/admin" },
];

export function NavMenu() {
  const menuItems = menuLinks.map((mLink) => (
    <MenuItem key={mLink.index}>
      <Link
        href={mLink.href}
        className="block px-4 py-2 font-mono text-rbyellow-300 text-sm data-[focus]:bg-cyan-300"
      >
        {mLink.displayName}
      </Link>
    </MenuItem>
  ));

  return (
    <nav className="flex items-center gap-6 p-4">
      <Menu as="div" className="relative">
        <MenuButton className="text-6xl text-gradient-yworange hover:text-rborange-500 hover:underline">
          Rolling Blackout
        </MenuButton>
        <MenuItems className="rbdrop rbpuff absolute left-0 mt-2 w-80 rounded-md border-2 border-rborange-500 bg-rbpurple-700/75 text-bold text-shadow-md text-shadow-rbred-500 shadow-lg ring-1 ring-black/5">
          {menuItems}
        </MenuItems>
      </Menu>
    </nav>
  );
}
