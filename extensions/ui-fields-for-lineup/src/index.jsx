import React, { useState, useEffect } from "react";
import {
  Banner,
  Text,
  BlockStack,
  View,
  render,
  TextField,
  Checkbox,
  Button,
  useExtensionCapability,
  useApplyAttributeChange,
  useAttributes,
  useCartLines,
  Spinner,
  useBuyerJourneyIntercept,
  useBuyerJourneyCompleted,
} from "@shopify/checkout-ui-extensions-react";

render("Checkout::Dynamic::Render", () => <App />);

function App() {
  const [useLineupCard, setUseLineupCard] = useState(false);
  const [lineupCardNumber, setLineupCardNumber] = useState("");
  const [validationError, setValidationError] = useState("");
  const [saldoDisponible, setSaldoDisponible] = useState(null);
  const [saldoGastar, setSaldoGastar] = useState(null);
  const [cardAdded, setCardAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // New state for loader

  const canBlockProgress = useExtensionCapability("block_progress");
  const applyAttributeChange = useApplyAttributeChange();
  const attributes = useAttributes();
  const cartLines = useCartLines();
  const journey = useBuyerJourneyCompleted();

  console.log("attributes", attributes);
  console.log("journey", useBuyerJourneyCompleted());

  // get the sum of all values into cartLines array in cartLines[].cost.totalAmount.amount
  const subtotal = cartLines.reduce((acc, item) => {
    return acc + item.cost.totalAmount.amount;
  }, 0);

  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (journey && canBlockProgress) {
      return apiCall()
        .then((result) => {
          if (attributes.lineupCardValue.value !== "null") {
            result.saldo += 4;
            if (result.saldo !== saldoDisponible) {
              const saldo =
                result.saldo >= subtotal
                  ? subtotal.toString()
                  : result.saldo.toString();
              setSaldoDisponible(data.saldo);
              setSaldoGastar(saldo);
              setCardAdded(true);
              clearValidationErrors();
              return {
                behavior: "block",
                reason: "La Tarjeta Lineup Rewards ha actualizado su saldo",
                errors: [
                  {
                    // In addition, show an error at the page level
                    message:
                      "El saldo de su tarjeta Lineup Rewards ha cambiado",
                  },
                ],
              };
            } else {
              return {
                behavior: "allow",
              };
            }
          } else {
            return {
              behavior: "allow",
            };
          }
        })
        .catch((error) => {
          console.error(error);
          return {
            behavior: "block",
            reason: "Existe un problema con la transacción",
            errors: [
              {
                // In addition, show an error at the page level
                message: "Existe un problema con la transacción",
              },
            ],
          };
        });
    } else {
      return {
        behavior: "allow",
      };
    }
  });

  useEffect(async () => {
    setLineupCardNumber("");
    setValidationError("");
    setSaldoDisponible(null);
    setCardAdded(false);
    await applyAttributeChange({
      key: "lineupCardValue",
      type: "updateAttribute",
      value: "null",
    });
  }, [useLineupCard]);

  function clearValidationErrors() {
    setValidationError("");
  }

  async function handleButtonClick() {
    if (useLineupCard) {
      //Start validations
      const regex = /^[0-9]+$/;

      if (lineupCardNumber.trim() === "") {
        setValidationError("Ingresa el número de tarjeta");
        return;
      }

      if (lineupCardNumber.length < 9) {
        setValidationError("La tarjeta debe tener más de 9 dígitos");
        return;
      }

      if (!regex.test(lineupCardNumber)) {
        setValidationError("La tarjeta solo debe contener números");
        return;
      }

      setIsLoading(true); // Start loader

      const data = await apiCall(); // Call API

      setIsLoading(false); // Stop loader

      if (data.esValido) {
        const saldo =
          data.saldo >= subtotal ? subtotal.toString() : data.saldo.toString();
        setSaldoDisponible(data.saldo);
        setSaldoGastar(saldo);
        setCardAdded(true);
        clearValidationErrors();
        //Agrega un el numero y valor de la tarjeta a los atributos
        await applyAttributeChange({
          key: "lineupCardValue",
          type: "updateAttribute",
          value: saldo,
        });
      } else {
        setValidationError(
          "El número de la tarjeta Lineup Rewards es inválido"
        );
      }
    }
  }

  async function apiCall() {
    // Simulating fetch delay
    return {
      esValido: true,
      saldo: 2000,
    };
  }

  async function handleRemoveCard() {
    setCardAdded(false);
    setSaldoDisponible(null);
    setLineupCardNumber("");
    await applyAttributeChange({
      key: "lineupCardValue",
      type: "updateAttribute",
      value: "null",
    });
  }

  return (
    <BlockStack>
      <View padding="base">
        <Banner status="info">
          <Checkbox
            checked={useLineupCard}
            onChange={setUseLineupCard}
            disabled={isLoading ? true : false}
          >
            {useLineupCard
              ? "Eliminar tarjeta Lineup Rewards"
              : "Usar tarjeta Lineup Rewards para obtener un descuento"}
          </Checkbox>
        </Banner>
      </View>
      {useLineupCard && (
        <BlockStack spacing="base">
          {!cardAdded && (
            <BlockStack spacing="base">
              <TextField
                label="Número de tarjeta Lineup Rewards"
                value={lineupCardNumber}
                onChange={setLineupCardNumber}
                onInput={clearValidationErrors}
                required={canBlockProgress}
                disabled={isLoading ? true : false}
                error={validationError}
              />
              <Button
                disabled={isLoading ? true : false}
                onPress={handleButtonClick}
              >
                Agregar tarjeta lineup para esta compra
              </Button>
              {isLoading && <Spinner />} {/* Loader */}
            </BlockStack>
          )}
          {saldoDisponible !== null && cardAdded && (
            <Banner status="success" title="Tarjeta Lineup Rewards Agregada">
              <BlockStack>
                <Text>Número de tarjeta: {lineupCardNumber}</Text>
                <Text>Saldo disponible en la tarjeta: ${saldoDisponible}</Text>
                <Text appearance="info">
                  Valor de la tarjeta a utilizar en la compra: $ {saldoGastar}
                </Text>
                <Button kind="secondary" onPress={handleRemoveCard}>
                  Eliminar Tarjeta
                </Button>
              </BlockStack>
            </Banner>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}

export default App;
