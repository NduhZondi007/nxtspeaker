/* @ds-bundle: {"format":4,"namespace":"NXTSpeakerDesignSystem_f20208","components":[{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"Sidebar","sourcePath":"components/layout/Sidebar.jsx"},{"name":"TopBar","sourcePath":"components/layout/TopBar.jsx"},{"name":"SpeakerCard","sourcePath":"components/speakers/SpeakerCard.jsx"},{"name":"ALL_EXPERTISE","sourcePath":"components/speakers/SpeakerFilters.jsx"},{"name":"SpeakerFilters","sourcePath":"components/speakers/SpeakerFilters.jsx"},{"name":"Badge","sourcePath":"components/ui/Badge.jsx"},{"name":"BookingStatusBadge","sourcePath":"components/ui/Badge.jsx"},{"name":"Button","sourcePath":"components/ui/Button.jsx"},{"name":"Icon","sourcePath":"components/ui/Icon.jsx"},{"name":"Input","sourcePath":"components/ui/Input.jsx"},{"name":"Textarea","sourcePath":"components/ui/Input.jsx"},{"name":"Select","sourcePath":"components/ui/Input.jsx"},{"name":"Modal","sourcePath":"components/ui/Modal.jsx"},{"name":"Toast","sourcePath":"components/ui/Toast.jsx"},{"name":"ToastStack","sourcePath":"components/ui/Toast.jsx"}],"sourceHashes":{"components/brand/Logo.jsx":"c3d04c9f3cf7","components/layout/Sidebar.jsx":"a3a9b6b5b964","components/layout/TopBar.jsx":"c5baece7c4d7","components/speakers/SpeakerCard.jsx":"db35b7fa278f","components/speakers/SpeakerFilters.jsx":"e9a602f11601","components/ui/Badge.jsx":"0f799371249c","components/ui/Button.jsx":"1c4f6c7fafaa","components/ui/Icon.jsx":"94d0335a44e2","components/ui/Input.jsx":"4573e75dfe2a","components/ui/Modal.jsx":"d1e9104aa26e","components/ui/Toast.jsx":"875cf9f95405","ui_kits/client_portal/Screens.jsx":"0f976296bdfa","ui_kits/marketing_site/Hero.jsx":"41a9d420c322","ui_kits/marketing_site/Nav.jsx":"c09567f5d2ac","ui_kits/marketing_site/Pages.jsx":"866f847bcda7","ui_kits/marketing_site/Sections.jsx":"d1a13d41a7cb"},"inlinedExternals":[],"unexposedExports":[{"name":"adminNav","sourcePath":"components/layout/Sidebar.jsx"},{"name":"clientNav","sourcePath":"components/layout/Sidebar.jsx"},{"name":"speakerNav","sourcePath":"components/layout/Sidebar.jsx"}]} */

(() => {

const __ds_ns = (window.NXTSpeakerDesignSystem_f20208 = window.NXTSpeakerDesignSystem_f20208 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Renders the supplied NXT Speaker badge files. Never redraw or recolour the mark —
   pick the variant that matches the background. The 2026 badge pack contains circular
   badge lockups only; there is no horizontal lockup file, so `orientation="horizontal"`
   sets the badge beside a typographic NXT SPEAKER wordmark in Archivo 900. */
const files = {
  navy: 'logo-badge-navy.png',
  orange: 'logo-badge-orange.png',
  white: 'logo-badge-white.png',
  onNavy: 'logo-badge-on-navy.jpg',
  onOrange: 'logo-badge-on-orange.jpg'
};
function Logo({
  variant = 'navy',
  size = 44,
  orientation = 'badge',
  assetBase = 'assets',
  style,
  ...rest
}) {
  const src = String(assetBase).replace(/\/$/, '') + '/' + files[variant];
  const onDark = variant === 'white';
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      ...style
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "NXT Speaker",
    width: size,
    height: size,
    style: {
      display: 'block',
      borderRadius: variant.indexOf('on') === 0 ? '50%' : 0
    }
  }), orientation === 'horizontal' && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: Math.round(size * 0.4),
      lineHeight: 1,
      letterSpacing: 'var(--tracking-tight)',
      textTransform: 'uppercase',
      color: onDark ? '#fff' : 'var(--color-primary)'
    }
  }, "NXT Speaker"));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/ui/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Two exports mirroring src/components/ui/Badge.tsx: the lavender Badge, and the
   booking-status badge with its six fixed statuses. */
function Badge({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-medium)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      background: 'var(--color-support)',
      color: 'var(--color-primary)',
      ...style
    }
  }), children);
}
const statusStyles = {
  PENDING: {
    background: 'rgba(98,157,171,.15)',
    color: 'var(--color-secondary)',
    border: '1px solid rgba(98,157,171,.3)'
  },
  CONFIRMED: {
    background: 'rgba(107,158,120,.15)',
    color: 'var(--color-success)',
    border: '1px solid rgba(107,158,120,.3)'
  },
  DEPOSIT_PAID: {
    background: 'rgba(3,30,87,.1)',
    color: 'var(--color-primary)',
    border: '1px solid rgba(3,30,87,.2)'
  },
  COMPLETED: {
    background: 'rgba(3,30,87,.2)',
    color: 'var(--color-primary)',
    border: '1px solid rgba(3,30,87,.3)'
  },
  CANCELLED: {
    background: 'rgba(196,122,106,.15)',
    color: 'var(--color-danger)',
    border: '1px solid rgba(196,122,106,.3)'
  },
  DECLINED: {
    background: 'rgba(154,161,176,.15)',
    color: 'var(--color-muted)',
    border: '1px solid rgba(154,161,176,.3)'
  }
};
const statusLabels = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  DEPOSIT_PAID: 'Deposit Paid',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DECLINED: 'Declined'
};
function BookingStatusBadge({
  status = 'PENDING',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      ...statusStyles[status],
      ...style
    }
  }), statusLabels[status]);
}
Object.assign(__ds_scope, { Badge, BookingStatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ui/Badge.jsx", error: String((e && e.message) || e) }); }

// components/ui/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Mirrors src/components/ui/Button.tsx. Radius is 3px on every size; `gold` is the
   historical name of the orange CTA variant and is kept for parity with the codebase. */
const variants = {
  gold: {
    background: 'var(--color-accent)',
    color: '#fff',
    fontWeight: 'var(--weight-semibold)',
    border: '1px solid var(--color-accent)',
    boxShadow: '0 1px 2px rgba(3,30,87,.05)'
  },
  primary: {
    background: 'var(--color-primary)',
    color: '#fff',
    fontWeight: 'var(--weight-semibold)',
    border: '1px solid var(--color-primary)'
  },
  outline: {
    background: '#fff',
    color: 'var(--color-primary)',
    fontWeight: 'var(--weight-medium)',
    border: '1px solid var(--color-secondary)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-secondary)',
    fontWeight: 'var(--weight-medium)',
    border: '1px solid transparent'
  },
  soft: {
    background: 'var(--color-support)',
    color: 'var(--color-primary)',
    fontWeight: 'var(--weight-medium)',
    border: '1px solid transparent'
  },
  danger: {
    background: 'var(--color-danger)',
    color: '#fff',
    fontWeight: 'var(--weight-semibold)',
    border: '1px solid var(--color-danger)'
  }
};
const hovers = {
  gold: {
    background: 'var(--color-accent-hover)'
  },
  primary: {
    background: 'var(--color-primary-hover)'
  },
  outline: {
    background: 'var(--color-soft)'
  },
  ghost: {
    background: 'var(--color-soft)',
    color: 'var(--color-primary)'
  },
  soft: {
    background: 'var(--color-support-hover)'
  },
  danger: {
    opacity: .9
  }
};
const sizes = {
  sm: {
    padding: '6px 12px',
    fontSize: 'var(--text-xs)'
  },
  md: {
    padding: '12px 22px',
    fontSize: 'var(--text-sm)'
  },
  lg: {
    padding: '14px 32px',
    fontSize: 'var(--text-base)'
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  as = 'button',
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const off = disabled || loading;
  const Tag = as;
  const dis = variant === 'gold' ? {
    background: 'var(--color-accent-disabled)',
    color: 'var(--color-accent-disabled-text)',
    borderColor: 'var(--color-accent-disabled)'
  } : {
    opacity: .5
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({}, rest, {
    disabled: Tag === 'button' ? off : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      fontFamily: 'var(--font-body)',
      borderRadius: 'var(--radius-button)',
      cursor: off ? 'not-allowed' : 'pointer',
      userSelect: 'none',
      textDecoration: 'none',
      transition: 'all var(--dur-fast) ease',
      ...sizes[size],
      ...variants[variant],
      ...(hover && !off ? hovers[variant] : null),
      ...(off ? dis : null),
      ...style
    }
  }), loading && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  }), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ui/Button.jsx", error: String((e && e.message) || e) }); }

// components/ui/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Wrapper for Lucide (the icon set the app uses via lucide-react). In this design system the
   same glyphs come from the Lucide UMD build loaded from CDN, so names match 1:1 with the
   codebase imports — <Icon name="calendar-check" /> is lucide-react's CalendarCheck. */
function Icon({
  name,
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
  style,
  ...rest
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const render = () => {
      if (window.lucide && window.lucide.createIcons) {
        el.innerHTML = '<i data-lucide="' + name + '"></i>';
        window.lucide.createIcons({
          nameAttr: 'data-lucide',
          attrs: {
            width: size,
            height: size,
            stroke: color,
            'stroke-width': strokeWidth
          },
          root: el
        });
      }
    };
    if (window.lucide) render();else {
      const t = setInterval(() => {
        if (window.lucide) {
          render();
          clearInterval(t);
        }
      }, 60);
      return () => clearInterval(t);
    }
  }, [name, size, color, strokeWidth]);
  return /*#__PURE__*/React.createElement("span", _extends({
    ref: ref,
    "aria-hidden": true,
    style: {
      display: 'inline-flex',
      width: size,
      height: size,
      flex: '0 0 auto',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ui/Icon.jsx", error: String((e && e.message) || e) }); }

// components/layout/Sidebar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Mirrors src/components/layout/Sidebar.tsx: 256px navy column, white logo at the top over a
   white/10 rule, Space Mono portal label in teal/70, nav rows at 4px radius where the active
   row is white/10 with a 2px orange left border, and a user + Sign Out block at the foot. */
const clientNav = [{
  label: 'Dashboard',
  href: '/client/dashboard',
  icon: 'layout-dashboard'
}, {
  label: 'Find Speakers',
  href: '/client/discover',
  icon: 'search'
}, {
  label: 'My Bookings',
  href: '/client/bookings',
  icon: 'calendar-check'
}];
const speakerNav = [{
  label: 'Dashboard',
  href: '/speaker/dashboard',
  icon: 'layout-dashboard'
}, {
  label: 'My Bookings',
  href: '/speaker/bookings',
  icon: 'calendar-check'
}, {
  label: 'My Profile',
  href: '/speaker/profile',
  icon: 'user'
}, {
  label: 'Hospitality Rider',
  href: '/speaker/rider',
  icon: 'utensils'
}, {
  label: 'Earnings',
  href: '/speaker/earnings',
  icon: 'dollar-sign'
}];
const adminNav = [{
  label: 'Dashboard',
  href: '/admin/dashboard',
  icon: 'layout-dashboard'
}, {
  label: 'Users',
  href: '/admin/users',
  icon: 'users-2'
}, {
  label: 'Bookings',
  href: '/admin/bookings',
  icon: 'calendar-check'
}, {
  label: 'Speakers',
  href: '/admin/speakers',
  icon: 'search'
}];
const portalLabels = {
  CLIENT: 'Client Portal',
  SPEAKER: 'Speaker Portal',
  ADMIN: 'Admin Portal'
};
const navFor = {
  CLIENT: clientNav,
  SPEAKER: speakerNav,
  ADMIN: adminNav
};
function Sidebar({
  role = 'CLIENT',
  userName = 'User',
  active,
  onNavigate,
  assetBase = 'assets',
  style,
  ...rest
}) {
  const items = navFor[role] || clientNav;
  return /*#__PURE__*/React.createElement("aside", _extends({}, rest, {
    style: {
      width: 256,
      flex: '0 0 256px',
      display: 'flex',
      flexDirection: 'column',
      background: '#031E57',
      minHeight: 0,
      ...style
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6)',
      borderBottom: '1px solid rgba(255,255,255,.1)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Logo, {
    variant: "white",
    size: 32,
    orientation: "horizontal",
    assetBase: assetBase
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4) var(--space-6) var(--space-2)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, role === 'ADMIN' && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "shield-check",
    size: 10,
    color: "rgba(98,157,171,.7)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      fontWeight: 'var(--weight-semibold)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-widest)',
      color: 'rgba(98,157,171,.7)'
    }
  }, portalLabels[role])), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      padding: 'var(--space-2) var(--space-3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      overflowY: 'auto'
    }
  }, items.map(it => {
    const on = active === it.href;
    return /*#__PURE__*/React.createElement("a", {
      key: it.href,
      href: it.href,
      onClick: e => {
        if (onNavigate) {
          e.preventDefault();
          onNavigate(it.href);
        }
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: '10px 12px 10px 10px',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-medium)',
        fontFamily: 'var(--font-body)',
        textDecoration: 'none',
        transition: 'all var(--dur-fast) ease',
        borderLeft: '2px solid ' + (on ? 'var(--color-accent)' : 'transparent'),
        background: on ? 'rgba(255,255,255,.1)' : 'transparent',
        color: on ? '#fff' : 'rgba(255,255,255,.6)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 16
    }), /*#__PURE__*/React.createElement("span", null, it.label));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4)',
      borderTop: '1px solid rgba(255,255,255,.1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'rgba(98,157,171,.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--color-secondary)'
    }
  }, userName.charAt(0).toUpperCase())), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      color: '#fff',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, userName), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-10)',
      color: 'rgba(255,255,255,.4)',
      textTransform: 'capitalize'
    }
  }, role.toLowerCase()))), /*#__PURE__*/React.createElement("button", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      width: '100%',
      padding: '8px 12px',
      fontSize: 'var(--text-xs)',
      fontFamily: 'var(--font-body)',
      color: 'rgba(255,255,255,.5)',
      background: 'transparent',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "log-out",
    size: 14
  }), "Sign Out")));
}
Object.assign(__ds_scope, { clientNav, speakerNav, adminNav, Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/layout/TopBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Mirrors src/components/layout/TopBar.tsx — sticky, 90% white with a 20px backdrop blur,
   hairline bottom border, Archivo bold uppercase title, trailing slot then the bell. */
function TopBar({
  title,
  subtitle,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({}, rest, {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 30,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      padding: 'var(--space-4) var(--space-6)',
      borderBottom: '1px solid var(--color-line)',
      background: 'rgba(255,255,255,.9)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      ...style
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-2xl)',
      color: 'var(--color-primary)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-tight)',
      lineHeight: 'var(--leading-tight)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 'var(--text-xs)',
      color: 'var(--color-muted)'
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      flex: '0 0 auto'
    }
  }, children, /*#__PURE__*/React.createElement("button", {
    "aria-label": "Notifications",
    style: {
      all: 'unset',
      cursor: 'pointer',
      padding: 8,
      borderRadius: 'var(--radius-md)',
      color: 'var(--color-muted)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 18
  }))));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/TopBar.jsx", error: String((e && e.message) || e) }); }

// components/speakers/SpeakerCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Mirrors src/components/speakers/SpeakerCard.tsx exactly: 4:3 image, lavender category chip,
   Archivo 900 uppercase name, one-line topic, footer with Space Mono teal fee + orange Book button.
   Hover lifts 3px and swaps to the teal glow shadow. */
function SpeakerCard({
  name = 'Speaker',
  title,
  category = 'Speaker',
  fee,
  photo,
  location,
  onBook,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: '#fff',
      border: '1px solid var(--color-line)',
      borderRadius: 'var(--radius-card)',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all var(--dur-base) ease',
      transform: hover ? 'translateY(var(--lift-card))' : 'none',
      boxShadow: hover ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
      ...style
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      aspectRatio: '4 / 3',
      background: 'var(--color-soft)',
      overflow: 'hidden'
    }
  }, photo ? /*#__PURE__*/React.createElement("img", {
    src: photo,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(3,30,87,.1)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 48,
      color: 'rgba(3,30,87,.2)',
      textTransform: 'uppercase'
    }
  }, name.charAt(0))), location && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      background: 'rgba(0,0,0,.4)',
      borderRadius: 'var(--radius-pill)',
      backdropFilter: 'blur(4px)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 9,
    color: "rgba(255,255,255,.8)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-9)',
      color: 'rgba(255,255,255,.9)'
    }
  }, location))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'flex-start',
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-widest)',
      background: 'var(--color-support)',
      color: 'var(--color-primary)'
    }
  }, category), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 'var(--text-lg)',
      color: 'var(--color-primary)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-tight)',
      lineHeight: 'var(--leading-tight)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--color-ink)',
      lineHeight: 'var(--leading-snug)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 'var(--space-3)',
      marginTop: 'var(--space-1)',
      borderTop: '1px solid var(--color-line)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--type-price)',
      color: 'var(--color-secondary)'
    }
  }, fee), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-9)',
      color: 'var(--color-muted)'
    }
  }, "per event")), /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onBook && onBook();
    },
    style: {
      padding: '6px 12px',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      fontFamily: 'var(--font-body)',
      color: '#fff',
      background: 'var(--color-accent)',
      border: 'none',
      borderRadius: 'var(--radius-button)',
      cursor: 'pointer',
      transition: 'background-color var(--dur-fast) ease'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--color-accent-hover)',
    onMouseLeave: e => e.currentTarget.style.background = 'var(--color-accent)'
  }, "Book"))));
}
Object.assign(__ds_scope, { SpeakerCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/speakers/SpeakerCard.jsx", error: String((e && e.message) || e) }); }

// components/speakers/SpeakerFilters.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Mirrors src/components/speakers/SpeakerFilters.tsx — search + sort + Filters toggle,
   then an expandable panel of expertise chips (orange when selected), availability and
   format radios, and a ZAR fee range. */
const ALL_EXPERTISE = ['Leadership', 'AI', 'Digital Transformation', 'Sustainability', 'ESG', 'Innovation', 'Future of Work', 'Neuroscience', 'High Performance', 'Strategy', 'Entrepreneurship', 'Change Management'];
const ctrl = {
  padding: '10px 12px',
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-body)',
  borderRadius: 'var(--radius-md)',
  background: '#fff',
  color: 'var(--color-primary)',
  outline: 'none',
  border: '1px solid var(--color-secondary)',
  transition: 'all var(--dur-fast) ease'
};
const legend = {
  margin: '0 0 var(--space-2)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--weight-semibold)',
  color: 'var(--color-primary)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-wide)'
};
function RadioRow({
  label,
  checked,
  onChange
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      cursor: 'pointer',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    checked: checked,
    onChange: onChange,
    style: {
      accentColor: '#FF5700'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--color-primary)'
    }
  }, label));
}
function SpeakerFilters({
  filters = {},
  onChange,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const f = {
    search: '',
    expertise: [],
    available: null,
    format: '',
    minFee: 0,
    maxFee: 200000,
    sort: 'rating_desc',
    ...filters
  };
  const update = patch => onChange && onChange({
    ...f,
    ...patch
  });
  const active = f.search || f.expertise.length > 0 || f.available !== null || f.format || f.minFee > 0 || f.maxFee < 200000;
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      ...style
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: '1 1 260px',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      color: 'var(--color-muted)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 16,
    color: "var(--color-muted)"
  })), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Search speakers by name or topic...",
    value: f.search,
    onChange: e => update({
      search: e.target.value
    }),
    style: {
      ...ctrl,
      width: '100%',
      paddingLeft: 36
    }
  })), /*#__PURE__*/React.createElement("select", {
    value: f.sort,
    onChange: e => update({
      sort: e.target.value
    }),
    style: {
      ...ctrl,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "rating_desc"
  }, "Top Rated"), /*#__PURE__*/React.createElement("option", {
    value: "fee_asc"
  }, "Fee: Low to High"), /*#__PURE__*/React.createElement("option", {
    value: "fee_desc"
  }, "Fee: High to Low"), /*#__PURE__*/React.createElement("option", {
    value: "events_desc"
  }, "Most Events")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(!open),
    style: {
      ...ctrl,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      cursor: 'pointer',
      border: '1px solid ' + (open ? 'var(--color-secondary)' : 'var(--color-line)'),
      background: open ? 'rgba(98,157,171,.1)' : '#fff',
      color: open ? 'var(--color-secondary)' : 'var(--color-primary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "sliders-horizontal",
    size: 16
  }), "Filters", active && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: 'var(--color-accent)',
      color: '#fff',
      fontSize: 'var(--text-9)',
      fontWeight: 'var(--weight-bold)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, "\u2713")), active && /*#__PURE__*/React.createElement("button", {
    onClick: () => update({
      search: '',
      expertise: [],
      available: null,
      format: '',
      minFee: 0,
      maxFee: 200000,
      sort: 'rating_desc'
    }),
    style: {
      ...ctrl,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      cursor: 'pointer',
      border: '1px solid var(--color-line)',
      color: 'var(--color-muted)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  }), "Clear")), open && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--color-line)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      animation: 'slide-up .2s ease-out'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: legend
  }, "Expertise"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 'var(--space-4)'
    }
  }, ALL_EXPERTISE.map(tag => {
    const on = f.expertise.indexOf(tag) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: tag,
      onClick: () => update({
        expertise: on ? f.expertise.filter(e => e !== tag) : [...f.expertise, tag]
      }),
      style: {
        padding: '4px 10px',
        fontSize: 'var(--text-xs)',
        fontFamily: 'var(--font-body)',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        transition: 'all var(--dur-fast) ease',
        background: on ? 'var(--color-accent)' : 'transparent',
        color: on ? '#fff' : 'var(--color-primary)',
        fontWeight: on ? 'var(--weight-semibold)' : 'var(--weight-regular)',
        border: '1px solid ' + (on ? 'var(--color-accent)' : 'var(--color-line)')
      }
    }, tag);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: legend
  }, "Availability"), [{
    label: 'All',
    value: null
  }, {
    label: 'Available Now',
    value: true
  }, {
    label: 'Unavailable',
    value: false
  }].map(o => /*#__PURE__*/React.createElement(RadioRow, {
    key: String(o.value),
    label: o.label,
    checked: f.available === o.value,
    onChange: () => update({
      available: o.value
    })
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: legend
  }, "Format"), [{
    label: 'Any Format',
    value: ''
  }, {
    label: 'In-Person',
    value: 'in-person'
  }, {
    label: 'Virtual',
    value: 'virtual'
  }, {
    label: 'Hybrid',
    value: 'hybrid'
  }].map(o => /*#__PURE__*/React.createElement(RadioRow, {
    key: o.value,
    label: o.label,
    checked: f.format === o.value,
    onChange: () => update({
      format: o.value
    })
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: legend
  }, "Fee Range (ZAR)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    placeholder: "Min",
    value: f.minFee || '',
    onChange: e => update({
      minFee: Number(e.target.value) || 0
    }),
    style: {
      ...ctrl,
      width: '100%',
      padding: '6px 8px',
      fontSize: 'var(--text-xs)',
      border: '1px solid var(--color-line)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-muted)',
      fontSize: 'var(--text-xs)'
    }
  }, "\u2013"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    placeholder: "Max",
    value: f.maxFee === 200000 ? '' : f.maxFee,
    onChange: e => update({
      maxFee: Number(e.target.value) || 200000
    }),
    style: {
      ...ctrl,
      width: '100%',
      padding: '6px 8px',
      fontSize: 'var(--text-xs)',
      border: '1px solid var(--color-line)'
    }
  }))))));
}
Object.assign(__ds_scope, { ALL_EXPERTISE, SpeakerFilters });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/speakers/SpeakerFilters.jsx", error: String((e && e.message) || e) }); }

// components/ui/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Mirrors src/components/ui/Input.tsx: Space Mono uppercase label, 4px radius,
   teal border that turns orange on focus with an orange 20% ring. */
function shell(label, hint, error, inputId, control) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--color-primary)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)'
    }
  }, label), control, error && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--color-danger)'
    }
  }, error), hint && !error && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--color-muted)'
    }
  }, hint));
}
function fieldStyle(focus, error, extra) {
  return {
    width: '100%',
    padding: '10px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-primary)',
    background: '#fff',
    borderRadius: 'var(--radius-input)',
    border: '1px solid ' + (error ? 'var(--color-danger)' : focus ? 'var(--color-accent)' : 'var(--color-secondary)'),
    boxShadow: focus ? error ? '0 0 0 2px rgba(196,122,106,.2)' : 'var(--ring-focus)' : 'none',
    outline: 'none',
    transition: 'all var(--dur-fast) ease',
    ...extra
  };
}
function Input({
  label,
  hint,
  error,
  id,
  iconLeft,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const input = /*#__PURE__*/React.createElement("input", _extends({}, rest, {
    id: inputId,
    onFocus: e => {
      setFocus(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur && rest.onBlur(e);
    },
    style: fieldStyle(focus, error, {
      paddingLeft: iconLeft ? 36 : 12,
      ...style
    })
  }));
  const control = iconLeft ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--color-muted)',
      display: 'flex'
    }
  }, iconLeft), input) : input;
  return shell(label, hint, error, inputId, control);
}
function Textarea({
  label,
  hint,
  error,
  id,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return shell(label, hint, error, inputId, /*#__PURE__*/React.createElement("textarea", _extends({}, rest, {
    id: inputId,
    onFocus: e => {
      setFocus(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur && rest.onBlur(e);
    },
    style: fieldStyle(focus, error, {
      resize: 'vertical',
      minHeight: 80,
      lineHeight: 'var(--leading-body)',
      ...style
    })
  })));
}
function Select({
  label,
  hint,
  error,
  id,
  options = [],
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return shell(label, hint, error, inputId, /*#__PURE__*/React.createElement("select", _extends({}, rest, {
    id: inputId,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: fieldStyle(focus, error, {
      cursor: 'pointer',
      ...style
    })
  }), options.map(o => {
    const v = typeof o === 'string' ? o : o.value,
      l = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
Object.assign(__ds_scope, { Input, Textarea, Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ui/Input.jsx", error: String((e && e.message) || e) }); }

// components/ui/Modal.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Mirrors src/components/ui/Modal.tsx — ink/60 scrim with blur, 12px panel radius,
   Archivo black uppercase title, overshoot enter animation. */
const widths = {
  sm: 384,
  md: 448,
  lg: 512,
  xl: 576,
  '2xl': 672
};
function Modal({
  open = true,
  onClose,
  title,
  maxWidth = 'lg',
  children,
  style,
  ...rest
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--overlay-scrim)',
      backdropFilter: 'var(--blur-scrim)'
    }
  }), /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    style: {
      position: 'relative',
      width: '100%',
      maxWidth: widths[maxWidth],
      background: '#fff',
      borderRadius: 'var(--radius-modal)',
      boxShadow: 'var(--shadow-modal)',
      overflow: 'hidden',
      animation: 'modal-enter var(--dur-modal) var(--ease-overshoot)',
      ...style
    }
  }), title && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-4) var(--space-6)',
      borderBottom: '1px solid var(--color-line)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 'var(--text-lg)',
      color: 'var(--color-primary)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-tight)'
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      all: 'unset',
      cursor: 'pointer',
      padding: 6,
      borderRadius: 'var(--radius-md)',
      color: 'var(--color-muted)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowY: 'auto',
      maxHeight: '85vh'
    }
  }, children)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ui/Modal.jsx", error: String((e && e.message) || e) }); }

// components/ui/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Mirrors src/components/ui/Toast.tsx: white card, hairline border, 8px radius,
   bottom-right stack, lucide glyph tinted per type. Auto-dismiss is 4000ms in the app. */
const typeConfig = {
  success: {
    icon: 'check-circle',
    color: 'var(--color-success)'
  },
  error: {
    icon: 'x-circle',
    color: 'var(--color-danger)'
  },
  warning: {
    icon: 'alert-circle',
    color: 'var(--color-accent)'
  },
  info: {
    icon: 'info',
    color: 'var(--color-secondary)'
  }
};
function Toast({
  type = 'info',
  title,
  message,
  onDismiss,
  style,
  ...rest
}) {
  const cfg = typeConfig[type];
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    role: "status",
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      width: 320,
      padding: 'var(--space-4)',
      background: '#fff',
      border: '1px solid var(--color-line)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-toast)',
      animation: 'toast-enter var(--dur-slide) var(--ease-out)',
      ...style
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: cfg.color,
      marginTop: 2,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: cfg.icon,
    size: 20,
    color: cfg.color
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--color-ink)'
    }
  }, title), message && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 'var(--text-xs)',
      color: 'var(--color-muted)'
    }
  }, message)), onDismiss && /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    "aria-label": "Dismiss",
    style: {
      all: 'unset',
      cursor: 'pointer',
      color: 'var(--color-muted)',
      display: 'flex',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 16
  })));
}
function ToastStack({
  toasts = [],
  onDismiss,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    style: {
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      ...style
    }
  }), toasts.map(t => /*#__PURE__*/React.createElement(Toast, _extends({
    key: t.id
  }, t, {
    onDismiss: () => onDismiss && onDismiss(t.id)
  }))));
}
Object.assign(__ds_scope, { Toast, ToastStack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ui/Toast.jsx", error: String((e && e.message) || e) }); }

// ui_kits/client_portal/Screens.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  TopBar,
  Button,
  Icon,
  BookingStatusBadge,
  SpeakerCard,
  SpeakerFilters,
  Modal,
  Input,
  Textarea,
  Select,
  Badge
} = window.NXTSpeakerDesignSystem_f20208;
const SPEAKERS = [{
  id: '1',
  name: 'Thabo Mokoena',
  title: 'Rebuilding trust after a public failure',
  category: 'Leadership',
  fee: 'R85 000',
  location: 'Johannesburg'
}, {
  id: '2',
  name: 'Naledi Khumalo',
  title: 'What AI actually changes about your operating model',
  category: 'AI',
  fee: 'R120 000',
  location: 'Cape Town'
}, {
  id: '3',
  name: 'Sipho Dlamini',
  title: 'Designing products for the next billion users',
  category: 'Innovation',
  fee: 'R64 000',
  location: 'Durban'
}, {
  id: '4',
  name: 'Zanele Mahlangu',
  title: 'Decarbonising a business that still has to make money',
  category: 'Sustainability',
  fee: 'R95 000',
  location: 'Pretoria'
}, {
  id: '5',
  name: 'Ayanda Nkosi',
  title: 'High performance without the burnout theatre',
  category: 'High Performance',
  fee: 'R72 000',
  location: 'Cape Town'
}, {
  id: '6',
  name: 'Kagiso Radebe',
  title: 'Change management when nobody trusts the memo',
  category: 'Change Management',
  fee: 'R58 000',
  location: 'Bloemfontein'
}, {
  id: '7',
  name: 'Refilwe Botha',
  title: 'ESG reporting that survives an audit',
  category: 'ESG',
  fee: 'R78 000',
  location: 'Sandton'
}, {
  id: '8',
  name: 'Bongani Sithole',
  title: 'The neuroscience of decisions under pressure',
  category: 'Neuroscience',
  fee: 'R110 000',
  location: 'Cape Town'
}];
const BOOKINGS = [{
  id: 'b1',
  event: 'Annual Leadership Summit',
  speaker: 'Thabo Mokoena',
  date: '12/11/2026',
  fee: 'R85 000',
  status: 'DEPOSIT_PAID'
}, {
  id: 'b2',
  event: 'Tech All-Hands Q4',
  speaker: 'Naledi Khumalo',
  date: '03/12/2026',
  fee: 'R120 000',
  status: 'PENDING'
}, {
  id: 'b3',
  event: 'Sustainability Forum',
  speaker: 'Zanele Mahlangu',
  date: '18/09/2026',
  fee: 'R95 000',
  status: 'CONFIRMED'
}, {
  id: 'b4',
  event: 'Product Offsite',
  speaker: 'Sipho Dlamini',
  date: '02/07/2026',
  fee: 'R64 000',
  status: 'COMPLETED'
}, {
  id: 'b5',
  event: 'Sales Kickoff',
  speaker: 'Ayanda Nkosi',
  date: '21/05/2026',
  fee: 'R72 000',
  status: 'CANCELLED'
}];
const card = {
  background: '#fff',
  border: '1px solid var(--color-line)',
  borderRadius: '12px'
};
const cardH2 = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontWeight: 'var(--weight-bold)',
  fontSize: 'var(--text-lg)',
  color: 'var(--color-primary)'
};
function Dashboard({
  onNavigate
}) {
  const stats = [['Active Bookings', '3', 'calendar-check', '#FF5700'], ['Events Completed', '1', 'trending-up', '#629DAB'], ['Total Spent', 'R64 000', 'dollar-sign', '#031E57'], ['Speakers Available', '184', 'search', '#629DAB']];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Good afternoon, Lerato",
    subtitle: "Here's what's happening with your bookings"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-8)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
      gap: 'var(--space-4)'
    }
  }, stats.map(([label, value, icon, color]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      background: '#fff',
      border: '1px solid var(--color-line)',
      borderTop: '2px solid ' + color,
      borderRadius: 'var(--radius-card)',
      padding: 'var(--space-4) 20px 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--color-secondary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: 'var(--radius-md)',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-soft)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 14,
    color: color
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '14px 0 0',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 'var(--text-3xl)',
      lineHeight: 'var(--leading-none)',
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--color-primary)'
    }
  }, value)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)',
      gap: 'var(--space-6)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-4) 20px',
      borderBottom: '1px solid var(--color-line)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: cardH2
  }, "Recent Bookings"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => onNavigate('/client/bookings')
  }, "View all")), BOOKINGS.slice(0, 4).map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: b.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: '14px 20px',
      borderTop: i ? '1px solid var(--color-line)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--color-ink)'
    }
  }, b.event), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 'var(--text-xs)',
      color: 'var(--color-muted)'
    }
  }, b.speaker, " \xB7 ", b.date)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(BookingStatusBadge, {
    status: b.status
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--color-secondary)'
    }
  }, b.fee))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      ...cardH2,
      marginBottom: 'var(--space-4)'
    }
  }, "Quick Actions"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    onClick: () => onNavigate('/client/discover'),
    style: {
      width: '100%',
      justifyContent: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16
  }), " Find Speakers"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: () => onNavigate('/client/bookings'),
    style: {
      width: '100%',
      justifyContent: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar-check",
    size: 16
  }), " View Bookings"))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4) 20px',
      borderBottom: '1px solid var(--color-line)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: cardH2
  }, "Top Speakers")), SPEAKERS.slice(0, 3).map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderTop: i ? '1px solid var(--color-line)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 6,
      background: 'rgba(98,157,171,.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--color-secondary)'
    }
  }, s.name.charAt(0)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--color-ink)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, s.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--color-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, s.title)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--color-secondary)',
      flex: '0 0 auto'
    }
  }, s.fee))))))));
}
function Discover({
  onOpen
}) {
  const [filters, setFilters] = React.useState({
    search: '',
    expertise: [],
    available: null,
    format: '',
    minFee: 0,
    maxFee: 200000,
    sort: 'rating_desc'
  });
  const list = SPEAKERS.filter(s => {
    const q = filters.search.toLowerCase();
    return (!q || s.name.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)) && (filters.expertise.length === 0 || filters.expertise.includes(s.category));
  });
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(TopBar, {
    title: "Find Speakers",
    subtitle: "Discover world-class speakers for your event"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(SpeakerFilters, {
    filters: filters,
    onChange: setFilters
  }), list.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '80px 0'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 40,
    color: "var(--color-line)"
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 'var(--space-4) 0 0',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      color: 'var(--color-muted)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-tight)'
    }
  }, "No speakers found"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 'var(--space-2) 0 0',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-muted)'
    }
  }, "Try adjusting your filters")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--color-muted)'
    }
  }, list.length, " speaker", list.length !== 1 ? 's' : '', " found"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))',
      gap: 'var(--space-4)'
    }
  }, list.map(s => /*#__PURE__*/React.createElement(SpeakerCard, _extends({
    key: s.id
  }, s, {
    onClick: () => onOpen(s),
    onBook: () => onOpen(s)
  })))))));
}
function Bookings({
  onOpen
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(TopBar, {
    title: "My Bookings",
    subtitle: "Every request, confirmation and completed event"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...card,
      overflow: 'hidden'
    }
  }, BOOKINGS.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: b.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: '16px 20px',
      borderTop: i ? '1px solid var(--color-line)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 6,
      background: 'rgba(3,30,87,.08)',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      color: 'var(--color-primary)'
    }
  }, b.speaker.charAt(0)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--color-ink)'
    }
  }, b.event), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 'var(--text-xs)',
      color: 'var(--color-muted)'
    }
  }, b.speaker, " \xB7 ", b.date)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--color-secondary)',
      flex: '0 0 auto'
    }
  }, b.fee), /*#__PURE__*/React.createElement(BookingStatusBadge, {
    status: b.status
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    onClick: () => onOpen(b)
  }, "Open"))))));
}
function SpeakerSheet({
  speaker,
  onClose,
  onBook
}) {
  if (!speaker) return null;
  return /*#__PURE__*/React.createElement(Modal, {
    open: true,
    onClose: onClose,
    maxWidth: "2xl"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-primary)',
      padding: 'var(--space-6)',
      display: 'flex',
      gap: 'var(--space-6)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 88,
      height: 88,
      borderRadius: 8,
      background: 'rgba(255,255,255,.1)',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 36,
      color: 'rgba(255,255,255,.3)'
    }
  }, speaker.name.charAt(0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '2px 8px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--color-support)',
      color: 'var(--color-primary)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-widest)'
    }
  }, speaker.category), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '10px 0 4px',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 'var(--text-2xl)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-tight)',
      color: '#fff'
    }
  }, speaker.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'rgba(255,255,255,.7)'
    }
  }, speaker.title))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, [speaker.category, 'Keynote', 'Workshop', 'In-Person'].map(t => /*#__PURE__*/React.createElement(Badge, {
    key: t
  }, t))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--type-body)'
    }
  }, speaker.name.split(' ')[0], " has delivered 61 events across South Africa and speaks to boards and all-hands audiences alike. Sessions are built from the client brief, not a fixed slide deck."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      paddingTop: 'var(--space-4)',
      borderTop: '1px solid var(--color-line)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-price)',
      fontSize: 'var(--text-xl)',
      color: 'var(--color-secondary)'
    }
  }, speaker.fee), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-9)',
      color: 'var(--color-muted)'
    }
  }, "PER EVENT")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onClose
  }, "Close"), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    onClick: () => onBook(speaker)
  }, "Request booking"))))));
}
function BookingWizard({
  speaker,
  onClose,
  onSubmit
}) {
  const [step, setStep] = React.useState(1);
  if (!speaker) return null;
  const steps = ['Event', 'Logistics', 'Rider'];
  return /*#__PURE__*/React.createElement(Modal, {
    open: true,
    onClose: onClose,
    maxWidth: "2xl",
    title: 'Request ' + speaker.name
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      marginBottom: 'var(--space-6)'
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      flex: 1,
      paddingTop: 8,
      borderTop: '2px solid ' + (i + 1 <= step ? 'var(--color-accent)' : 'var(--color-line)'),
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color: i + 1 <= step ? 'var(--color-primary)' : 'var(--color-muted)'
    }
  }, String(i + 1).padStart(2, '0'), " ", s))), step === 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Event name",
    placeholder: "Annual leadership summit"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Event date",
    type: "date"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Format",
    options: ['In-Person', 'Virtual', 'Hybrid']
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Audience size",
    type: "number",
    placeholder: "350"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(Textarea, {
    label: "Brief",
    rows: 3,
    placeholder: "Who is in the room, and what should they leave with?"
  }))), step === 2 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Venue",
    placeholder: "Sandton Convention Centre"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "City",
    placeholder: "Johannesburg"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Session start",
    type: "time"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Session length",
    placeholder: "45 minutes"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(Textarea, {
    label: "Travel notes",
    rows: 2,
    placeholder: "Flights, transfers, overnight requirements"
  }))), step === 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-soft)',
      border: '1px solid var(--color-line)',
      borderRadius: 8,
      padding: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--color-secondary)',
      marginBottom: 8
    }
  }, "Hospitality rider"), [['Travel', 'Economy flights, airport transfer'], ['Accommodation', '4-star, night before'], ['On site', 'Still water, lapel mic, 20 min green room']].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 16,
      padding: '6px 0',
      font: 'var(--type-small)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-muted)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-primary)',
      textAlign: 'right'
    }
  }, v)))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      font: 'var(--type-small)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    defaultChecked: true,
    style: {
      accentColor: '#FF5700',
      marginTop: 3
    }
  }), /*#__PURE__*/React.createElement("span", null, "I accept the hospitality rider and the 25% deposit terms."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      marginTop: 'var(--space-6)',
      paddingTop: 'var(--space-4)',
      borderTop: '1px solid var(--color-line)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-price)',
      color: 'var(--color-secondary)'
    }
  }, speaker.fee), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-9)',
      color: 'var(--color-muted)'
    }
  }, "QUOTED FEE \xB7 DEPOSIT 25%")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, step > 1 && /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: () => setStep(step - 1)
  }, "Back"), step < 3 ? /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    onClick: () => setStep(step + 1)
  }, "Continue") : /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    onClick: onSubmit
  }, "Send request")))));
}
Object.assign(window, {
  Dashboard,
  Discover,
  Bookings,
  SpeakerSheet,
  BookingWizard,
  SPEAKERS,
  BOOKINGS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/client_portal/Screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Hero.jsx
try { (() => {
const {
  Button,
  Logo
} = window.NXTSpeakerDesignSystem_f20208;

/* Momentum direction: navy hero band, oversized uppercase Archivo, the badge used
   oversized at 15% opacity as a watermark. */
function Hero({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      background: 'var(--color-primary)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-badge-white.png",
    alt: "",
    "aria-hidden": true,
    style: {
      position: 'absolute',
      right: -140,
      top: -90,
      width: 620,
      opacity: .15,
      transform: 'rotate(-12deg)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: 'var(--space-24) var(--gutter)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-widest)',
      color: 'var(--color-secondary)'
    }
  }, "South Africa \xB7 Est. 2026"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 'var(--space-4) 0 0',
      maxWidth: 900,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 'clamp(40px,6vw,var(--text-hero))',
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-tight)',
      textTransform: 'uppercase',
      color: '#fff'
    }
  }, "Book the speaker.", /*#__PURE__*/React.createElement("br", null), "Not the agency."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 'var(--space-6) 0 0',
      maxWidth: 560,
      font: 'var(--type-lead)',
      color: 'rgba(255,255,255,.75)'
    }
  }, "Verified speakers, real fees in rand, and a booking request that lands with the speaker \u2014 no gatekeepers, no commission games."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      marginTop: 'var(--space-8)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    size: "lg",
    onClick: () => onNavigate('speakers')
  }, "Find a speaker"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "lg",
    onClick: () => onNavigate('forspeakers'),
    style: {
      background: 'transparent',
      color: '#fff',
      borderColor: 'var(--color-secondary)'
    }
  }, "I am a speaker")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-12)',
      marginTop: 'var(--space-16)',
      flexWrap: 'wrap'
    }
  }, [['184', 'Verified speakers'], ['R0', 'Agency commission'], ['48 hrs', 'Median reply time']].map(([v, l]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 'var(--text-3xl)',
      letterSpacing: 'var(--tracking-tight)',
      color: '#fff'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--color-secondary)',
      marginTop: 6
    }
  }, l))))));
}
Object.assign(window, {
  Hero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Nav.jsx
try { (() => {
const {
  Logo,
  Button
} = window.NXTSpeakerDesignSystem_f20208;
function Nav({
  page,
  onNavigate
}) {
  const links = [['Speakers', 'speakers'], ['How it works', 'how'], ['For speakers', 'forspeakers']];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: 'rgba(255,255,255,.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--color-line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '14px var(--gutter)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate('home');
    },
    style: {
      textDecoration: 'none'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "navy",
    size: 38,
    orientation: "horizontal",
    assetBase: "../../assets"
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-8)'
    }
  }, links.map(([label, key]) => /*#__PURE__*/React.createElement("a", {
    key: key,
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate(key);
    },
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      textDecoration: 'none',
      color: page === key ? 'var(--color-primary)' : 'var(--color-ink)'
    }
  }, label)), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate('login');
    },
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-medium)',
      textDecoration: 'none',
      color: 'var(--color-ink)'
    }
  }, "Sign in"), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    size: "md",
    onClick: () => onNavigate('speakers')
  }, "Book a speaker"))));
}
Object.assign(window, {
  Nav
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Nav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Pages.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  SpeakerCard,
  SpeakerFilters,
  Button,
  Badge,
  Modal,
  Input,
  Textarea,
  Select,
  Icon,
  Logo,
  BookingStatusBadge
} = window.NXTSpeakerDesignSystem_f20208;
function SpeakersPage({
  onOpen
}) {
  const [filters, setFilters] = React.useState({
    search: '',
    expertise: [],
    available: null,
    format: '',
    minFee: 0,
    maxFee: 200000,
    sort: 'rating_desc'
  });
  const list = window.SPEAKERS.filter(s => {
    const q = filters.search.toLowerCase();
    const okQ = !q || s.name.toLowerCase().includes(q) || s.title.toLowerCase().includes(q);
    const okE = filters.expertise.length === 0 || filters.expertise.includes(s.category);
    return okQ && okE;
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-soft)',
      borderBottom: '1px solid var(--color-line)',
      padding: 'var(--space-12) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 var(--gutter)'
    }
  }, /*#__PURE__*/React.createElement(window.Eyebrow, null, "Directory"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 'var(--space-3) 0 var(--space-6)',
      font: 'var(--type-h2)',
      textTransform: 'none',
      color: 'var(--color-primary)'
    }
  }, "Browse speakers"), /*#__PURE__*/React.createElement(SpeakerFilters, {
    filters: filters,
    onChange: setFilters
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: 'var(--space-8) var(--gutter) var(--space-24)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--color-muted)'
    }
  }, list.length, " of ", window.SPEAKERS.length, " speakers"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
      gap: 'var(--space-6)'
    }
  }, list.map(s => /*#__PURE__*/React.createElement(SpeakerCard, _extends({
    key: s.name
  }, s, {
    onClick: () => onOpen(s),
    onBook: () => onOpen(s)
  })))), list.length === 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--color-muted)'
    }
  }, "No speakers match those filters yet.")));
}
function ProfilePage({
  speaker,
  onBook
}) {
  const s = speaker || window.SPEAKERS[0];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-primary)',
      padding: 'var(--space-16) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 var(--gutter)',
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gap: 'var(--space-12)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 220,
      aspectRatio: '1',
      borderRadius: 'var(--radius-lg)',
      background: 'rgba(255,255,255,.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 88,
      color: 'rgba(255,255,255,.25)'
    }
  }, s.name.charAt(0))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '4px 12px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--color-support)',
      color: 'var(--color-primary)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)'
    }
  }, s.category), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 'var(--space-4) 0 var(--space-3)',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 'var(--text-h1)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-tight)',
      lineHeight: 'var(--leading-tight)',
      color: '#fff'
    }
  }, s.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 var(--space-6)',
      font: 'var(--type-lead)',
      color: 'rgba(255,255,255,.75)'
    }
  }, s.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-6)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-price)',
      fontSize: 'var(--text-2xl)',
      color: '#fff'
    }
  }, s.fee), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-9)',
      color: 'var(--color-secondary)'
    }
  }, "PER EVENT")), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    size: "lg",
    onClick: onBook
  }, "Request this speaker"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--color-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 12,
    color: "var(--color-secondary)"
  }), s.location))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: 'var(--space-16) var(--gutter)',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)',
      gap: 'var(--space-16)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(window.Eyebrow, null, "Talks"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 'var(--space-3) 0 var(--space-6)',
      font: 'var(--type-h3)',
      color: 'var(--color-primary)'
    }
  }, "Signature sessions"), [['Keynote · 45 min', s.title], ['Workshop · 3 hrs', 'A working session for the leadership team, with the awkward questions left in.'], ['Fireside · 30 min', 'Moderated conversation, no slides.']].map(([f, d]) => /*#__PURE__*/React.createElement("div", {
    key: f,
    style: {
      padding: 'var(--space-4) 0',
      borderTop: '1px solid var(--color-line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--color-secondary)',
      marginBottom: 6
    }
  }, f), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--type-body)'
    }
  }, d)))), /*#__PURE__*/React.createElement("aside", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-soft)',
      border: '1px solid var(--color-line)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--color-secondary)',
      marginBottom: 'var(--space-4)'
    }
  }, "At a glance"), [['Formats', 'In-person · Virtual'], ['Languages', 'English · isiZulu'], ['Events delivered', '61'], ['Travels from', s.location]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      padding: '8px 0',
      font: 'var(--type-small)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-muted)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-primary)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-4)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(BookingStatusBadge, {
    status: "CONFIRMED"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-small)',
      color: 'var(--color-muted)'
    }
  }, "Available Q4 2026")))));
}
function BookingModal({
  open,
  speaker,
  onClose,
  onSubmit
}) {
  const s = speaker || {};
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: 'Request ' + (s.name || 'speaker'),
    maxWidth: "2xl"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Organisation",
    placeholder: "Acme Group"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Event name",
    placeholder: "Annual leadership summit"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Event date",
    type: "date"
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Format",
    options: ['In-Person', 'Virtual', 'Hybrid']
  }), /*#__PURE__*/React.createElement(Input, {
    label: "City",
    placeholder: "Johannesburg"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Audience size",
    type: "number",
    placeholder: "350"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1'
    }
  }, /*#__PURE__*/React.createElement(Textarea, {
    label: "Brief",
    rows: 3,
    placeholder: "Who is in the room, and what should they leave with?"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1 / -1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      paddingTop: 'var(--space-4)',
      borderTop: '1px solid var(--color-line)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-price)',
      color: 'var(--color-secondary)'
    }
  }, s.fee), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-9)',
      color: 'var(--color-muted)'
    }
  }, "QUOTED FEE \xB7 DEPOSIT 25%")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    onClick: onSubmit
  }, "Send request")))));
}
function LoginPage({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '70vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-primary)',
      position: 'relative',
      overflow: 'hidden',
      padding: 'var(--space-16)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-badge-white.png",
    alt: "",
    "aria-hidden": true,
    style: {
      position: 'absolute',
      left: -120,
      bottom: -120,
      width: 460,
      opacity: .15,
      transform: 'rotate(8deg)'
    }
  }), /*#__PURE__*/React.createElement(Logo, {
    variant: "white",
    size: 34,
    orientation: "horizontal",
    assetBase: "../../assets"
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 'var(--space-16) 0 var(--space-4)',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 'var(--text-h2)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-tight)',
      color: '#fff',
      position: 'relative'
    }
  }, "Welcome back"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 320,
      font: 'var(--type-body)',
      color: 'rgba(255,255,255,.7)',
      position: 'relative'
    }
  }, "Sign in to manage briefs, bookings and deposits.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-16)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 360,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    type: "email",
    placeholder: "you@company.co.za"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Password",
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    size: "lg",
    onClick: () => onNavigate('speakers')
  }, "Sign in"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--type-small)',
      color: 'var(--color-muted)'
    }
  }, "No account yet? ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault()
  }, "Create one")))));
}
Object.assign(window, {
  SpeakersPage,
  ProfilePage,
  BookingModal,
  LoginPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Pages.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing_site/Sections.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  SpeakerCard,
  Button,
  Badge,
  Icon
} = window.NXTSpeakerDesignSystem_f20208;
const SPEAKERS = [{
  name: 'Thabo Mokoena',
  title: 'Rebuilding trust after a public failure',
  category: 'Leadership',
  fee: 'R85 000',
  location: 'Johannesburg'
}, {
  name: 'Naledi Khumalo',
  title: 'What AI actually changes about your operating model',
  category: 'AI',
  fee: 'R120 000',
  location: 'Cape Town'
}, {
  name: 'Sipho Dlamini',
  title: 'Designing products for the next billion users',
  category: 'Innovation',
  fee: 'R64 000',
  location: 'Durban'
}, {
  name: 'Zanele Mahlangu',
  title: 'Decarbonising a business that still has to make money',
  category: 'Sustainability',
  fee: 'R95 000',
  location: 'Pretoria'
}, {
  name: 'Ayanda Nkosi',
  title: 'High performance without the burnout theatre',
  category: 'High Performance',
  fee: 'R72 000',
  location: 'Cape Town'
}, {
  name: 'Kagiso Radebe',
  title: 'Change management when nobody trusts the memo',
  category: 'Change Management',
  fee: 'R58 000',
  location: 'Bloemfontein'
}];
function Eyebrow({
  children,
  tone
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-widest)',
      color: tone === 'dark' ? 'var(--color-secondary)' : 'var(--color-secondary)'
    }
  }, children);
}
function Featured({
  onNavigate,
  onOpen
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: '#fff',
      padding: 'var(--space-24) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 var(--gutter)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 'var(--space-8)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "Featured this month"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 'var(--space-3) 0 0',
      font: 'var(--type-h2)',
      color: 'var(--color-primary)'
    }
  }, "Speakers people rebook")), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: () => onNavigate('speakers')
  }, "See all 184 \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
      gap: 'var(--space-6)',
      marginTop: 'var(--space-8)'
    }
  }, SPEAKERS.slice(0, 3).map(s => /*#__PURE__*/React.createElement(SpeakerCard, _extends({
    key: s.name
  }, s, {
    onBook: () => onOpen(s)
  }))))));
}
function HowItWorks() {
  const steps = [['01', 'Search without a wall', 'Every profile shows the real fee in rand, formats, and past events. No "contact us for pricing".'], ['02', 'Send one brief', 'Tell the speaker about the audience, date and budget. It reaches them directly.'], ['03', 'Confirm and pay a deposit', 'Terms, hospitality rider and deposit are handled in the platform. Your event, your paperwork.']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--color-soft)',
      padding: 'var(--space-24) 0',
      borderTop: '1px solid var(--color-line)',
      borderBottom: '1px solid var(--color-line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 var(--gutter)'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "How it works"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 'var(--space-3) 0 var(--space-12)',
      font: 'var(--type-h2)',
      color: 'var(--color-primary)'
    }
  }, "Brief once. Compare fast. Book direct."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
      gap: 'var(--space-8)'
    }
  }, steps.map(([n, t, d]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      borderTop: '2px solid var(--color-secondary)',
      paddingTop: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-2xs)',
      letterSpacing: 'var(--tracking-widest)',
      color: 'var(--color-secondary)'
    }
  }, n), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 'var(--space-3) 0 var(--space-2)',
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-extrabold)',
      fontSize: 'var(--text-xl)',
      color: 'var(--color-primary)',
      letterSpacing: 'var(--tracking-tight)'
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      font: 'var(--type-small)',
      color: 'var(--color-ink)',
      lineHeight: 'var(--leading-body)'
    }
  }, d))))));
}
function ForSpeakers({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: '#fff',
      padding: 'var(--space-24) 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 var(--gutter)',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
      gap: 'var(--space-16)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "For speakers"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 'var(--space-3) 0 var(--space-4)',
      font: 'var(--type-h2)',
      color: 'var(--color-primary)'
    }
  }, "Own your calendar and your rate card"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 var(--space-6)',
      font: 'var(--type-body)'
    }
  }, "Set your own fee, publish your hospitality rider once, and get briefs that already match your topics and availability."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      flexWrap: 'wrap',
      marginBottom: 'var(--space-6)'
    }
  }, ['Your fee, published', 'Rider stored once', 'Direct client chat', 'Deposit tracking'].map(t => /*#__PURE__*/React.createElement(Badge, {
    key: t
  }, t))), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    onClick: () => onNavigate('login')
  }, "Apply to join")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--color-primary)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-8)'
    }
  }, [['Average brief-to-confirm', '6 days'], ['Bookings kept by speaker', '100%'], ['Platform fee', 'Flat, published']].map(([l, v], i) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: 'var(--space-4) 0',
      borderTop: i ? '1px solid rgba(255,255,255,.12)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--color-secondary)'
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-black)',
      fontSize: 'var(--text-xl)',
      color: '#fff'
    }
  }, v))))));
}
function Footer() {
  const cols = [['Discover', ['Browse speakers', 'Topics', 'Fee bands', 'Availability']], ['For speakers', ['Apply to join', 'Hospitality riders', 'Earnings', 'Speaker terms']], ['Company', ['About', 'Contact', 'Privacy', 'Terms']]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--color-primary)',
      padding: 'var(--space-16) 0 var(--space-8)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '0 var(--gutter)',
      display: 'grid',
      gridTemplateColumns: '2fr repeat(3,1fr)',
      gap: 'var(--space-8)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-badge-white.png",
    alt: "NXT Speaker",
    width: "48",
    height: "48"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 'var(--space-4) 0 0',
      maxWidth: 260,
      font: 'var(--type-small)',
      color: 'rgba(255,255,255,.6)'
    }
  }, "South Africa's disruptive speaker booking platform.")), cols.map(([h, items]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--color-secondary)',
      marginBottom: 'var(--space-4)'
    }
  }, h), items.map(i => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      display: 'block',
      marginBottom: 8,
      font: 'var(--type-small)',
      color: 'rgba(255,255,255,.7)',
      textDecoration: 'none',
      fontWeight: 'var(--weight-regular)'
    }
  }, i))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: 'var(--space-12) auto 0',
      padding: 'var(--space-6) var(--gutter) 0',
      borderTop: '1px solid rgba(255,255,255,.12)',
      display: 'flex',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      color: 'rgba(255,255,255,.4)'
    }
  }, "\xA9 2026 NXT SPEAKER (PTY) LTD"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-10)',
      color: 'rgba(255,255,255,.4)'
    }
  }, "MADE IN SOUTH AFRICA")));
}
Object.assign(window, {
  Featured,
  HowItWorks,
  ForSpeakers,
  Footer,
  Eyebrow,
  SPEAKERS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing_site/Sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.TopBar = __ds_scope.TopBar;

__ds_ns.SpeakerCard = __ds_scope.SpeakerCard;

__ds_ns.ALL_EXPERTISE = __ds_scope.ALL_EXPERTISE;

__ds_ns.SpeakerFilters = __ds_scope.SpeakerFilters;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.BookingStatusBadge = __ds_scope.BookingStatusBadge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.ToastStack = __ds_scope.ToastStack;

})();
