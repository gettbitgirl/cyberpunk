---
title: MCL Test Suite
publish: true
cssclasses:
  - hud
---

## Test 1: Side by Side Floating Callouts (Two Left Callouts)

> [!netrunner|left-medium] Netrunner Terminal
> Scanning subnet for ice...
> Breach protocol initialized.

> [!mox|left-medium] Mox Chatter
> Watch your back in Lizzie's, choom.
> Chrome don't protect against everything.

Text continuing after the two floating callouts. This text should flow around both cards naturally without awkward vertical drops or huge gaps.

---

## Test 2: Floating Callouts (Left and Right) with Inline Divider

> [!trauma|left-small] Trauma Team
> Platinum coverage confirmed.
> ETA: 180 seconds.

> [!militech|right-small] Militech Ops
> Perimeter secure.
> Awaiting further orders.

Text between two floating callouts. Here is some text that should sit between Trauma Team on the left and Militech on the right.

---

Here is a divider between the two floats. Notice how it fits within the inline space without piercing through either card.

## Test 3: Multi-Column Container

> [!multi-column]
>
> > [!kangtao] Kang-Tao Spec
> > Smart weaponry firmware v2.081.
>
> > [!arasaka] Arasaka Intel
> > Counter-intel monitoring ongoing.
>
> > [!shard] Encrypted Shard
> > Decryption key required.

