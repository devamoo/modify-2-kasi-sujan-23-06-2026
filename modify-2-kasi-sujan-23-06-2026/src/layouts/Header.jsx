import React, { useState, useRef, useEffect } from "react";
import avatar from "../assets/images/avatar-profile-user.svg";
import wipLogo from "../assets/images/Logo.png";
import { TbSearch } from "react-icons/tb";
import { IoMdNotificationsOutline } from "react-icons/io";

const Header = () => {
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center bg-surface mx-4 my-2 rounded-lg shadow-xs">
      <div className="wip-glass relative overflow-hidden rounded-xl px-4 py-2 flex gap-3.5 items-center transition-transform duration-300 hover:scale-[1.02]">
        {/* Animated shimmer sweep */}
        <span
          aria-hidden="true"
          className="wip-shimmer pointer-events-none absolute inset-y-0 left-0 w-2/3 -skew-x-12"
        />
        <img
          src={wipLogo}
          alt="WIP"
          className="relative h-13 w-auto object-contain shrink-0"
          style={{
            height: "52px",
            filter:
              "contrast(1.25) saturate(1.15) drop-shadow(0 1px 1.5px rgba(139, 105, 20, 0.18))",
          }}
        />
        <div className="relative hidden sm:flex flex-col leading-none border-l border-paleorange/50 pl-3 py-1">
          <p className="text-[9px] uppercase tracking-[0.45em] text-dark-yellow font-bold leading-none">
            Architecture
          </p>
          <p className="text-[9px] uppercase tracking-[0.45em] text-dark-yellow font-bold mt-1.5 leading-none">
            Interiors
          </p>
          <p className="text-[7px] uppercase tracking-[0.35em] text-text-subtle mt-2 leading-none">
            Chennai
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div
          ref={searchRef}
          className={`flex items-center bg-bg-soft rounded-full overflow-hidden transition-all duration-300 ease-in-out ${
            showSearch
              ? "w-40 sm:w-60"
              : "pl-2 w-7.5 items-center justify-center"
          }`}
        >
          <TbSearch
            size={30}
            className="cursor-pointer p-[6px] shrink-0 text-text"
            onClick={() => setShowSearch(!showSearch)}
          />
          <input
            type="text"
            placeholder="Search..."
            autoFocus={showSearch}
            onKeyDown={(e) => e.key === "Enter" && setShowSearch(false)}
            className={`bg-transparent rounded-full outline-none ml-2 text-sm w-full transition-all duration-300 ${
              showSearch ? "opacity-100" : "opacity-0 w-0"
            }`}
          />
        </div>

        <div className="relative">
          <IoMdNotificationsOutline
            size={30}
            className="bg-bg-soft rounded-full p-1 text-textcolor cursor-pointer"
          />
        </div>

        <div className="border-l border-border h-7.5" />

        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-textcolor">Alex Sterling</p>
          <p className="text-xs text-text-muted">Managing Partner</p>
        </div>

        <img
          src={avatar}
          alt="avatar"
          className="h-9 w-9 sm:h-10 sm:w-10 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default Header;
