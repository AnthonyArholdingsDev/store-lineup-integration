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
  useTotalAmount,
  Spinner,
} from "@shopify/checkout-ui-extensions-react";

render("Checkout::Reductions::RenderAfter", () => <App />);

function App() {
  const [useLineupCard, setUseLineupCard] = useState(false);
  const [lineupCardNumber, setLineupCardNumber] = useState("");
  const [validationError, setValidationError] = useState("");
  const [saldoDisponible, setSaldoDisponible] = useState(null);
  const [cardAdded, setCardAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // New state for loader

  const canBlockProgress = useExtensionCapability("block_progress");
  const totalAmount = useTotalAmount();

  useEffect(() => {
    setLineupCardNumber("");
    setValidationError("");
    setSaldoDisponible(null);
    setCardAdded(false);
  }, [useLineupCard]);

  function clearValidationErrors() {
    setValidationError("");
  }

  function handleButtonClick() {
    if (useLineupCard) {
      if (lineupCardNumber.trim() === "") {
        setValidationError("Ingresa el número de tarjeta");
        return;
      }

      setIsLoading(true); // Start loader

      // Simulating fetch delay
      setTimeout(() => {
        const data = {
          esValido: true,
          saldo: 2000,
        };

        setIsLoading(false); // Stop loader

        if (data.esValido) {
          setSaldoDisponible(data.saldo);
          setCardAdded(true);
          clearValidationErrors();
        } else {
          setValidationError(
            "El número de la tarjeta Lineup Rewards es inválido"
          );
        }
      }, 2000); // Replace this with your actual fetch call
    }
  }

  function handleRemoveCard() {
    setCardAdded(false);
    setSaldoDisponible(null);
    setLineupCardNumber("");
  }

  return (
    <BlockStack>
      <View padding="base">
        <Checkbox
          checked={useLineupCard}
          onChange={setUseLineupCard}
          disabled={isLoading ? true : false}
        >
          {useLineupCard
            ? "Eliminar tarjeta Lineup Rewards"
            : "Usar tarjeta Lineup Rewards para obtener descuento"}
        </Checkbox>
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
                  Valor de la tarjeta a utilizar en la compra: ${" "}
                  {saldoDisponible >= totalAmount.amount
                    ? totalAmount.amount
                    : saldoDisponible}
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
