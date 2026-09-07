// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CounterHook
 * @notice Educational Uniswap v4-style hook for CryptP Continuity (IDE compile → simulate → deploy).
 * @dev Self-contained stubs so browser WASM solc can compile without pulling v4-core.
 *      Production hooks should inherit `BaseHook` from v4-periphery and be mined via CREATE2
 *      so the address encodes the correct Hooks permission flags.
 *
 * Sepolia PoolManager: 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543
 * Docs: https://docs.uniswap.org/contracts/v4/guides/hooks/your-first-hook
 */

/// @dev Minimal currency / pool types (mirrors v4 naming for education).
type Currency is address;

struct PoolKey {
    Currency currency0;
    Currency currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

/// @dev Permission flag bits (subset of v4 Hooks.sol).
library HookFlags {
    uint160 internal constant BEFORE_SWAP_FLAG = 1 << 7;
    uint160 internal constant AFTER_SWAP_FLAG = 1 << 6;
}

struct HookPermissions {
    bool beforeInitialize;
    bool afterInitialize;
    bool beforeAddLiquidity;
    bool afterAddLiquidity;
    bool beforeRemoveLiquidity;
    bool afterRemoveLiquidity;
    bool beforeSwap;
    bool afterSwap;
    bool beforeDonate;
    bool afterDonate;
    bool beforeSwapReturnDelta;
    bool afterSwapReturnDelta;
    bool afterAddLiquidityReturnDelta;
    bool afterRemoveLiquidityReturnDelta;
}

contract CounterHook {
    address public immutable poolManager;

    uint256 public beforeSwapCount;
    uint256 public afterSwapCount;

    event BeforeSwapCounted(address indexed caller, uint256 newCount);
    event AfterSwapCounted(address indexed caller, uint256 newCount);

    error NotPoolManager();
    error ZeroPoolManager();

    constructor(address _poolManager) {
        if (_poolManager == address(0)) revert ZeroPoolManager();
        poolManager = _poolManager;
    }

    /// @notice Declares which v4 hook callbacks this contract intends to implement.
    function getHookPermissions() public pure returns (HookPermissions memory) {
        return
            HookPermissions({
                beforeInitialize: false,
                afterInitialize: false,
                beforeAddLiquidity: false,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: true,
                afterSwap: true,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            });
    }

    /// @notice Address flags this hook would need when mined with CREATE2 (before+after swap).
    function requiredHookFlags() public pure returns (uint160) {
        return HookFlags.BEFORE_SWAP_FLAG | HookFlags.AFTER_SWAP_FLAG;
    }

    function beforeSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        bytes calldata
    ) external returns (bytes4, int256, uint24) {
        _onlyPoolManager();
        unchecked {
            beforeSwapCount++;
        }
        emit BeforeSwapCounted(msg.sender, beforeSwapCount);
        return (this.beforeSwap.selector, 0, 0);
    }

    function afterSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        int256,
        bytes calldata
    ) external returns (bytes4, int128) {
        _onlyPoolManager();
        unchecked {
            afterSwapCount++;
        }
        emit AfterSwapCounted(msg.sender, afterSwapCount);
        return (this.afterSwap.selector, 0);
    }

    /**
     * @notice Sandbox / Continuity helper: simulate a PoolManager-authorized afterSwap.
     * @dev Only callable by `poolManager` — for local IDE demos deploy with
     *      `poolManager = your wallet` or use `sandboxBumpAfterSwap()`.
     */
    function demoCountAsPoolManager() external {
        _onlyPoolManager();
        unchecked {
            afterSwapCount++;
        }
        emit AfterSwapCounted(msg.sender, afterSwapCount);
    }

    /**
     * @notice IDE Continuity helper — increments afterSwapCount without PoolManager auth.
     * @dev Not for production pools. Lets CryptP sandbox/Interact prove the hook path.
     */
    function sandboxBumpAfterSwap() external {
        unchecked {
            afterSwapCount++;
        }
        emit AfterSwapCounted(msg.sender, afterSwapCount);
    }

    function _onlyPoolManager() internal view {
        if (msg.sender != poolManager) revert NotPoolManager();
    }
}
