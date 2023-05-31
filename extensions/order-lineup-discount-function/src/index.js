// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").InputQuery} InputQuery
 * @typedef {import("../generated/api").FunctionResult} FunctionResult
 */

/**
 * @type {FunctionResult} 
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

export default /**
 * @param {InputQuery} input
 * @returns {FunctionResult}
 */
(input) => {
  const lineupValue = input?.cart?.attribute;

  if (lineupValue?.value) {
    return {
      discountApplicationStrategy: DiscountApplicationStrategy.First,
      discounts: [
        {
          value: {
            fixedAmount: {
              amount: Number(lineupValue?.value),
            },
          },
          targets: [{ orderSubtotal: { excludedVariantIds: [] } }],
          message: "Descuento de tarjeta Lineup",
        },
      ],
    };
  }

  return EMPTY_DISCOUNT;
};
